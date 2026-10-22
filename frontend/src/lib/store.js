import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { apiRequest } from "./api";

export const COLLECTIONS = {
  cashiers: "edify_cashiers",
  students: "edify_students",
  classes: "edify_classes",
  feeStructures: "edify_fee_structures",
  feeTerms: "edify_fee_terms",
  payments: "edify_payments",
  academicYears: "edify_academic_years",
  settings: "edify_school_settings",
  activeYear: "edify_active_year",
};

const endpoints = {
  edify_cashiers: "/cashiers",
  edify_students: "/students",
  edify_classes: "/classes",
  edify_fee_structures: "/fee-structures",
  edify_fee_terms: "/fee-terms",
  edify_payments: "/payments",
  edify_academic_years: "/academic-years",
  edify_school_settings: "/settings",
  edify_active_year: "/active-year",
};
const cache = new Map();
const fallbacks = new Map();
const listeners = new Map();
const writeQueues = new Map();

function emit(key) {
  listeners.get(key)?.forEach((listener) => listener(cache.get(key)));
}

function normalize(key, value) {
  return key === "edify_active_year" ? (value.activeYear ?? "") : value;
}

async function fetchCollection(key) {
  const endpoint = endpoints[key];
  if (!endpoint) throw new Error(`No API endpoint configured for ${key}`);
  const value = normalize(key, await apiRequest(endpoint));
  cache.set(key, value);
  emit(key);
  return value;
}

export function refreshCollection(key) {
  return fetchCollection(key);
}

export function clearCollectionCache() {
  for (const [key, fallback] of fallbacks) {
    cache.set(key, fallback);
    emit(key);
  }
}

async function saveCollection(key, previous, next) {
  const endpoint = endpoints[key];
  if (key === "edify_active_year") {
    await apiRequest(endpoint, { method: "PUT", body: { activeYear: next } });
    await fetchCollection("edify_academic_years");
    return;
  }
  if (key === "edify_school_settings") {
    await apiRequest(endpoint, { method: "PATCH", body: next });
    return;
  }
  if (key === "edify_fee_terms") {
    const structureIds = new Set([...previous, ...next].map((term) => term.structureId));
    await Promise.all(
      [...structureIds].map((structureId) =>
        apiRequest(`/fee-terms?structureId=${encodeURIComponent(structureId)}`, {
          method: "PUT",
          body: next
            .filter((term) => term.structureId === structureId)
            .map(({ id, name, amount, dueDate }) => ({ id, name, amount, dueDate })),
        }),
      ),
    );
    return;
  }

  const oldById = new Map(previous.map((record) => [record.id, record]));
  const nextById = new Map(next.map((record) => [record.id, record]));
  const operations = [];
  for (const [id, record] of nextById) {
    const oldRecord = oldById.get(id);
    if (!oldRecord) {
      operations.push(() => apiRequest(endpoint, { method: "POST", body: record }));
    } else if (JSON.stringify(oldRecord) !== JSON.stringify(record)) {
      operations.push(() =>
        apiRequest(`${endpoint}/${encodeURIComponent(id)}`, { method: "PATCH", body: record }),
      );
    }
  }
  for (const id of oldById.keys()) {
    if (!nextById.has(id)) {
      operations.push(() =>
        apiRequest(`${endpoint}/${encodeURIComponent(id)}`, { method: "DELETE" }),
      );
    }
  }
  for (const operation of operations) await operation();
  if (key === "edify_cashiers") await fetchCollection(key);
  if (key === "edify_classes") {
    await Promise.all([fetchCollection("edify_students"), fetchCollection("edify_fee_structures")]);
  }
  if (key === "edify_academic_years") await fetchCollection("edify_active_year");
}

export function useCollection(key, fallback) {
  fallbacks.set(key, fallback);
  const [value, setValue] = useState(() => (cache.has(key) ? cache.get(key) : fallback));
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    const subscription = (next) => {
      if (mounted) {
        setValue(next);
        setReady(true);
      }
    };
    const subscriptions = listeners.get(key) ?? new Set();
    subscriptions.add(subscription);
    listeners.set(key, subscriptions);
    fetchCollection(key)
      .catch((error) => {
        if (mounted) toast.error(`Could not load data: ${error.message}`);
      })
      .finally(() => {
        if (mounted) setReady(true);
      });
    if (cache.has(key)) setValue(cache.get(key));
    return () => {
      mounted = false;
      subscriptions.delete(subscription);
      if (subscriptions.size === 0) listeners.delete(key);
    };
  }, [key]);

  const write = useCallback(
    (nextValue) => {
      const previous = cache.has(key) ? cache.get(key) : value;
      const next = typeof nextValue === "function" ? nextValue(previous) : nextValue;
      cache.set(key, next);
      setValue(next);
      emit(key);
      const queued = writeQueues.get(key) ?? Promise.resolve();
      const operation = queued
        .then(() => saveCollection(key, previous, next))
        .catch(async (error) => {
          toast.error(`Could not save changes: ${error.message}`);
          try {
            await fetchCollection(key);
          } catch {
            // Keep the optimistic state visible if the server cannot be reached.
          }
        });
      writeQueues.set(key, operation);
      return operation;
    },
    [key, value],
  );

  return { data: value, setData: write, ready };
}

export function notifyStoreChange() {
  for (const key of endpoints ? Object.keys(endpoints) : []) emit(key);
}
