export class SnapshotCommand {
  constructor(model, description, applyMutation) {
    if (!model || typeof model.snapshot !== 'function' || typeof model.restore !== 'function') {
      throw new TypeError('SnapshotCommand requires a snapshot-capable model.');
    }
    if (typeof applyMutation !== 'function') throw new TypeError('applyMutation must be a function.');
    this.model = model;
    this.description = description || 'Pipeline profile mutation';
    this.applyMutation = applyMutation;
    this.before = null;
    this.after = null;
  }

  execute() {
    if (this.after) {
      this.model.restore(this.after, `redo:${this.description}`);
      return;
    }
    this.before = this.model.snapshot();
    this.applyMutation(this.model);
    this.after = this.model.snapshot();
  }

  undo() {
    if (!this.before) throw new Error('Command has not been executed.');
    this.model.restore(this.before, `undo:${this.description}`);
  }
}

export class CommandHistory extends EventTarget {
  constructor(limit = 100) {
    super();
    this.limit = Math.max(1, Number(limit) || 100);
    this.undoStack = [];
    this.redoStack = [];
  }

  get canUndo() {
    return this.undoStack.length > 0;
  }

  get canRedo() {
    return this.redoStack.length > 0;
  }

  execute(command) {
    if (!command || typeof command.execute !== 'function' || typeof command.undo !== 'function') {
      throw new TypeError('Command must implement execute() and undo().');
    }
    command.execute();
    this.undoStack.push(command);
    if (this.undoStack.length > this.limit) this.undoStack.shift();
    this.redoStack = [];
    this.#emit('execute', command);
  }

  undo() {
    const command = this.undoStack.pop();
    if (!command) return false;
    command.undo();
    this.redoStack.push(command);
    this.#emit('undo', command);
    return true;
  }

  redo() {
    const command = this.redoStack.pop();
    if (!command) return false;
    command.execute();
    this.undoStack.push(command);
    this.#emit('redo', command);
    return true;
  }

  clear() {
    this.undoStack = [];
    this.redoStack = [];
    this.#emit('clear', null);
  }

  #emit(action, command) {
    this.dispatchEvent(new CustomEvent('historyChanged', {
      detail: {
        action,
        description: command?.description ?? '',
        canUndo: this.canUndo,
        canRedo: this.canRedo,
      },
    }));
  }
}

export function moveTable2ElevationCommand(model, id, elevation) {
  return new SnapshotCommand(model, `Move Table 2 elevation ${id}`, (target) => target.moveTable2Elevation(id, elevation));
}

export function moveTable3DepthCommand(model, id, z) {
  return new SnapshotCommand(model, `Move Table 3 depth ${id}`, (target) => target.moveDepth(id, z));
}

export function moveTable3MarkerCommand(model, id, absoluteH) {
  return new SnapshotCommand(model, `Move Table 3 marker ${id}`, (target) => target.moveMarker(id, absoluteH));
}

export function renameTable3MarkerCommand(model, id, markerText) {
  return new SnapshotCommand(model, `Rename Table 3 marker ${id}`, (target) => target.renameMarker(id, markerText));
}

export function addTable2NodeCommand(model, payload) {
  return new SnapshotCommand(model, 'Add Table 2 elevation node', (target) => target.insertTable2Node(payload));
}

export function addTable3DepthCommand(model, payload) {
  return new SnapshotCommand(model, 'Add Table 3 depth node', (target) => target.addDepth(payload));
}

export function addTable3MarkerCommand(model, payload) {
  return new SnapshotCommand(model, 'Add Table 3 marker', (target) => target.addMarker(payload));
}

export function deleteProfileRowCommand(model, id) {
  return new SnapshotCommand(model, `Delete profile row ${id}`, (target) => target.deleteRow(id));
}
