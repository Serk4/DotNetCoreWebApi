import * as React from 'react';
import { Modal, Button, Form } from 'react-bootstrap';
import { User } from '../types';

interface Props {
  initialUser?: User | null;
  onCancel: () => void;
  onSubmit: (user: Omit<User, 'id'> & Partial<Pick<User, 'id'>>) => void;
  submitting?: boolean;
}

const UserForm: React.FC<Props> = ({ initialUser = null, onCancel, onSubmit, submitting = false }) => {
  const [userName, setUserName] = React.useState(initialUser?.userName ?? '');
  const [email, setEmail] = React.useState(initialUser?.email ?? '');
  const [userType, setUserType] = React.useState<number>(initialUser?.userType ?? 2);
  const [errors, setErrors] = React.useState<{ userName?: string; email?: string } | null>(null);

  React.useEffect(() => {
    setUserName(initialUser?.userName ?? '');
    setEmail(initialUser?.email ?? '');
    setUserType(initialUser?.userType ?? 2);
    setErrors(null);
  }, [initialUser]);

  const validate = () => {
    const e: typeof errors = {};
    if (!userName.trim()) e.userName = 'Username is required';
    if (!email.trim()) e.email = 'Email is required';
    setErrors(Object.keys(e).length ? e : null);
    return !Object.keys(e).length;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    const payload: Omit<User, 'id'> & Partial<Pick<User, 'id'>> = {
      ...(initialUser?.id ? { id: initialUser.id } : {}),
      userName: userName.trim(),
      email: email.trim(),
      userType
    };
    onSubmit(payload);
  };

  return (
    <Modal show onHide={onCancel} backdrop="static" centered>
      <Form onSubmit={handleSubmit} noValidate>
        <Modal.Header closeButton>
          <Modal.Title>{initialUser ? 'Edit User' : 'New User'}</Modal.Title>
        </Modal.Header>

        <Modal.Body>
          <Form.Group className="mb-3" controlId="userName">
            <Form.Label>Username</Form.Label>
            <Form.Control
              value={userName}
              onChange={e => setUserName(e.target.value)}
              isInvalid={!!errors?.userName}
            />
            <Form.Control.Feedback type="invalid">{errors?.userName}</Form.Control.Feedback>
          </Form.Group>

          <Form.Group className="mb-3" controlId="email">
            <Form.Label>Email</Form.Label>
            <Form.Control
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              isInvalid={!!errors?.email}
            />
            <Form.Control.Feedback type="invalid">{errors?.email}</Form.Control.Feedback>
          </Form.Group>

          <Form.Group className="mb-0" controlId="userType">
            <Form.Label>Type</Form.Label>
            <Form.Select value={userType} onChange={e => setUserType(Number(e.target.value))}>
              <option value={0}>Admin</option>
              <option value={1}>Technician</option>
              <option value={2}>Analyst</option>
            </Form.Select>
          </Form.Group>
        </Modal.Body>

        <Modal.Footer>
          <Button variant="secondary" onClick={onCancel} disabled={submitting}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" disabled={submitting}>
            {submitting ? 'Saving...' : 'Save'}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
};

export default UserForm;