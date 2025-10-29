import React, { useEffect, useState } from 'react';
import { Modal, Button, Form, ListGroup, InputGroup, FormControl } from 'react-bootstrap';
import UsersApi from '../api/users';
import DnaProcessesApi from '../api/dnaprocesses';
import { User, DnaProcess } from '../types';
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult
} from '@hello-pangea/dnd';

interface Props {
  initialWorkflow?: {
    id?: number;
    name: string;
    createdByUser?: User | null;
    workflowProcesses?: { id: number; processOrder: number; dnaProcess?: DnaProcess | null }[];
  } | null;
  onCancel: () => void;
  onSubmit: (payload: { id?: number; name: string; createdBy: number; dnaProcessIds?: number[] }) => void;
  submitting?: boolean;
}

const WorkflowForm: React.FC<Props> = ({ initialWorkflow = null, onCancel, onSubmit, submitting = false }) => {
  const [name, setName] = useState(initialWorkflow?.name ?? '');
  const [createdBy, setCreatedBy] = useState<number>(initialWorkflow?.createdByUser?.id ?? 1);
  const [errors, setErrors] = useState<{ name?: string; createdBy?: string } | null>(null);

  const [users, setUsers] = useState<User[]>([]);
  const [availableProcesses, setAvailableProcesses] = useState<DnaProcess[]>([]);
  const [selectedProcesses, setSelectedProcesses] = useState<DnaProcess[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingProcesses, setLoadingProcesses] = useState(false);

  useEffect(() => {
    // Initialise fields and selectedProcesses from initialWorkflow
    setName(initialWorkflow?.name ?? '');
    setCreatedBy(initialWorkflow?.createdByUser?.id ?? 1);
    if (initialWorkflow?.workflowProcesses) {
      const ordered = initialWorkflow.workflowProcesses
        .slice()
        .sort((a, b) => a.processOrder - b.processOrder)
        .map(wp => wp.dnaProcess!)
        .filter(Boolean);
      setSelectedProcesses(ordered);
    } else {
      setSelectedProcesses([]);
    }
    setErrors(null);
  }, [initialWorkflow]);

  // Fetch users (unchanged)
  useEffect(() => {
    let mounted = true;
    setLoadingUsers(true);
    UsersApi.list()
      .then(list => {
        if (!mounted) return;
        setUsers(list);
        if (!initialWorkflow && list.length) setCreatedBy(list[0].id);
      })
      .catch(() => {
        if (!mounted) return;
        setUsers([]);
      })
      .finally(() => {
        if (!mounted) return;
        setLoadingUsers(false);
      });

    return () => { mounted = false; };
  }, [initialWorkflow]);

  // Fetch processes and compute "available" each time the selectedProcesses change.
  // This ensures processes already selected (including when editing) are excluded.
  useEffect(() => {
    let mounted = true;
    setLoadingProcesses(true);
    DnaProcessesApi.list()
      .then(list => {
        if (!mounted) return;
        const available = list.filter(p => !selectedProcesses.some(s => s.id === p.id));
        setAvailableProcesses(available);
      })
      .catch(() => {
        if (!mounted) return;
        setAvailableProcesses([]);
      })
      .finally(() => {
        if (!mounted) return;
        setLoadingProcesses(false);
      });

    return () => { mounted = false; };
  }, [selectedProcesses]); // re-run when selectedProcesses changes (including initial populate)

  // Utility: reorder array for drag result
  const reorder = <T,>(list: T[], startIndex: number, endIndex: number): T[] => {
    const result = Array.from(list);
    const [removed] = result.splice(startIndex, 1);
    result.splice(endIndex, 0, removed);
    return result;
  };

  const validate = () => {
    const e: typeof errors = {};
    if (!name.trim()) e.name = 'Name is required';
    if (!createdBy || createdBy <= 0) e.createdBy = 'Creator is required';
    setErrors(Object.keys(e).length ? e : null);
    return !Object.keys(e).length;
  };

  const handleAddProcess = (id: number) => {
    const proc = availableProcesses.find(p => p.id === id);
    if (!proc) return;
    setSelectedProcesses(prev => [...prev, proc]);
    setAvailableProcesses(prev => prev.filter(p => p.id !== id));
  };

  const handleRemoveSelected = (id: number) => {
    const removed = selectedProcesses.find(p => p.id === id);
    if (!removed) return;
    setSelectedProcesses(prev => prev.filter(p => p.id !== id));
    setAvailableProcesses(prev => [...availableProcesses, removed]);
  };

  // Handlers for up/down are kept as alternative to drag-and-drop
  const moveSelected = (index: number, dir: -1 | 1) => {
    setSelectedProcesses(prev => {
      const arr = prev.slice();
      const to = index + dir;
      if (to < 0 || to >= arr.length) return arr;
      const [item] = arr.splice(index, 1);
      arr.splice(to, 0, item);
      return arr;
    });
  };

  // Handle drag end from DnD context
  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    // We only support reordering inside the selected list
    if (result.source.droppableId === 'selected' && result.destination.droppableId === 'selected') {
      setSelectedProcesses(prev => reorder(prev, result.source.index, result.destination!.index));
    }
  };

  const handleSubmit = (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!validate()) return;
    const payload = {
      ...(initialWorkflow?.id ? { id: initialWorkflow.id } : {}),
      name: name.trim(),
      createdBy,
      dnaProcessIds: selectedProcesses.map(p => p.id)
    };
    onSubmit(payload);
  };

  return (
    <Modal show onHide={onCancel} backdrop="static" size="lg" centered>
      <Form onSubmit={handleSubmit} noValidate>
        <Modal.Header closeButton>
          <Modal.Title>{initialWorkflow ? 'Edit Workflow' : 'New Workflow'}</Modal.Title>
        </Modal.Header>

        <Modal.Body>
          <Form.Group className="mb-3" controlId="workflowName">
            <Form.Label>Name</Form.Label>
            <Form.Control
              value={name}
              onChange={e => setName(e.target.value)}
              isInvalid={!!errors?.name}
            />
            <Form.Control.Feedback type="invalid">{errors?.name}</Form.Control.Feedback>
          </Form.Group>

          <Form.Group className="mb-3" controlId="workflowCreatedBy">
            <Form.Label>Created By</Form.Label>
            <Form.Select
              value={createdBy}
              onChange={e => setCreatedBy(Number(e.target.value))}
              disabled={loadingUsers}
              isInvalid={!!errors?.createdBy}
            >
              {users.map(u => (
                <option key={u.id} value={u.id}>{u.userName} ({u.email})</option>
              ))}
            </Form.Select>
            <Form.Control.Feedback type="invalid">{errors?.createdBy}</Form.Control.Feedback>
          </Form.Group>

          <Form.Label>Processes (order = list order)</Form.Label>
          <div className="d-flex gap-3">
            <div style={{ flex: 1 }}>
              <Form.Label className="small">Available</Form.Label>
              <InputGroup className="mb-2">
                <FormControl as="select" id="availSelect" aria-label="Available processes">
                  {availableProcesses.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </FormControl>
                <Button
                  variant="outline-secondary"
                  onClick={() => {
                    const sel = (document.getElementById('availSelect') as HTMLSelectElement);
                    if (!sel) return;
                    const val = Number(sel.value);
                    if (val) handleAddProcess(val);
                  }}
                >
                  Add
                </Button>
              </InputGroup>
              <ListGroup style={{ maxHeight: 300, overflow: 'auto' }}>
                {availableProcesses.map(p => (
                  <ListGroup.Item key={p.id}>{p.name}</ListGroup.Item>
                ))}
                {availableProcesses.length === 0 && <div className="text-muted small p-2">No available processes</div>}
              </ListGroup>
            </div>

            <div style={{ width: 16 }} />

            <div style={{ flex: 1 }}>
              <Form.Label className="small">Selected (drag to reorder)</Form.Label>

              <DragDropContext onDragEnd={onDragEnd}>
                <Droppable droppableId="selected">
                  {(provided) => (
                    <ListGroup
                      ref={provided.innerRef as any}
                      {...provided.droppableProps}
                      style={{ maxHeight: 300, overflow: 'auto' }}
                    >
                      {selectedProcesses.map((p, i) => (
                        <Draggable key={p.id.toString()} draggableId={p.id.toString()} index={i}>
                          {(prov, snapshot) => (
                            <ListGroup.Item
                              ref={prov.innerRef}
                              {...prov.draggableProps}
                              {...prov.dragHandleProps}
                              className="d-flex justify-content-between align-items-center"
                              style={{
                                ...prov.draggableProps.style,
                                userSelect: 'none',
                                background: snapshot.isDragging ? '#e9ecef' : undefined
                              }}
                            >
                              <div className="d-flex align-items-center">
                                <span className="badge bg-secondary me-3" aria-hidden>{i + 1}</span>
                                <div>{p.name}</div>
                              </div>
                              <div className="btn-group btn-group-sm" role="group">
                                <button type="button" className="btn btn-outline-secondary" onClick={() => moveSelected(i, -1)} aria-label="Move up">▲</button>
                                <button type="button" className="btn btn-outline-secondary" onClick={() => moveSelected(i, 1)} aria-label="Move down">▼</button>
                                <button type="button" className="btn btn-outline-danger" onClick={() => handleRemoveSelected(p.id)} aria-label="Remove">✕</button>
                              </div>
                            </ListGroup.Item>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                      {selectedProcesses.length === 0 && <div className="text-muted small p-2">No processes selected</div>}
                    </ListGroup>
                  )}
                </Droppable>
              </DragDropContext>
            </div>
          </div>
        </Modal.Body>

        <Modal.Footer>
          <Button variant="secondary" onClick={onCancel} disabled={submitting}>Cancel</Button>
          <Button variant="primary" type="submit" disabled={submitting}>{submitting ? 'Saving...' : 'Save'}</Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
};

export default WorkflowForm;