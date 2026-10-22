export function printDocument(target) {
  const body = document.body;
  const previousTarget = body.dataset.printTarget;
  const restore = () => {
    if (previousTarget === undefined) delete body.dataset.printTarget;
    else body.dataset.printTarget = previousTarget;
  };

  body.dataset.printTarget = target;
  window.addEventListener("afterprint", restore, { once: true });
  requestAnimationFrame(() => window.print());
}
