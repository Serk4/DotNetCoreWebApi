import axios from 'axios';
import { User } from '../types';

const apiBase = (process.env.REACT_APP_API_URL ?? 'https://localhost:7049').replace(/\/$/, '');
const usersEndpoint = `${apiBase}/api/users`;

type CreateUserPayload = Omit<User, 'id'>;
type UpdateUserPayload = Partial<Omit<User, 'id'>> & { id: number };

function handleAxiosError(e: unknown): never {
    if (axios.isAxiosError(e)) {
        const msg =
            (e.response && (e.response.data as any)?.message) ||
            (e.response && JSON.stringify(e.response.data)) ||
            e.message ||
            'Network error';
        throw new Error(msg);
    }
    throw new Error(String(e));
}

export async function listUsers(): Promise<User[]> {
    try {
        const res = await axios.get<User[]>(usersEndpoint);
        return res.data;
    } catch (e) {
        handleAxiosError(e);
    }
}

export async function getUser(id: number): Promise<User> {
    try {
        const res = await axios.get<User>(`${usersEndpoint}/${id}`);
        return res.data;
    } catch (e) {
        handleAxiosError(e);
    }
}

export async function createUser(payload: CreateUserPayload): Promise<User> {
    try {
        const res = await axios.post<User>(usersEndpoint, payload);
        return res.data;
    } catch (e) {
        handleAxiosError(e);
    }
}

export async function updateUser(payload: UpdateUserPayload): Promise<void> {
    try {
        await axios.put(`${usersEndpoint}/${payload.id}`, payload);
    } catch (e) {
        handleAxiosError(e);
    }
}

export async function deleteUser(id: number): Promise<void> {
    try {
        await axios.delete(`${usersEndpoint}/${id}`);
    } catch (e) {
        handleAxiosError(e);
    }
}

const UsersApi = {
    list: listUsers,
    get: getUser,
    create: createUser,
    update: updateUser,
    remove: deleteUser
};

export default UsersApi;