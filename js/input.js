const inputContexts = [];

let baseInputHandlers = {};

export function setBaseInputHandlers(handlers) {
  baseInputHandlers = handlers;
}

// Give a menu or other interface control of the inputs.
export function pushInputContext(handlers) {
  const context = {
    handlers
  };

  inputContexts.push(context);

  return context;
}

// Return input control to the previous context.
export function popInputContext(context) {
  const index = inputContexts.indexOf(context);

  if (index !== -1) {
    inputContexts.splice(index, 1);
  }
}

// Send an input action to the active context.
export function handleInput(action) {
  // Shoulder buttons only work on the map, or in a menu that defines them.
  if (action === "lt" || action === "rt") {
    if (inputContexts.length > 0) {
      const top = inputContexts[inputContexts.length - 1].handlers[action];

      return typeof top === "function" ? top() : undefined;
    }
  }

  for (let i = inputContexts.length - 1; i >= 0; i--) {
    const handler = inputContexts[i].handlers[action];

    if (typeof handler === "function") {
      return handler();
    }
  }

  const baseHandler = baseInputHandlers[action];

  if (typeof baseHandler === "function") {
    return baseHandler();
  }
}

// Swallows every input. Used while animations play.
export const NO_INPUT = {
  up() {}, down() {}, left() {}, right() {}, select() {}, back() {}
};
