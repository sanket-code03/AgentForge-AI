const API=import.meta.env.VITE_API_BASE_URL||'http://localhost:8080/api';
export type User={name:string;email:string};
export type Task={id:number;prompt:string;status:string;output?:string;error?:string;createdAt:string;finishedAt?:string};
export function token(){return localStorage.getItem('agentforge_token')}
async function request<T>(path:string,options:RequestInit={}):Promise<T>{const headers=new Headers(options.headers);headers.set('Content-Type','application/json');const t=token();if(t)headers.set('Authorization',`Bearer ${t}`);const r=await fetch(`${API}${path}`,{...options,headers});const body=await r.json().catch(()=>({}));if(!r.ok)throw new Error(body.message||`Request failed (${r.status})`);return body as T}
export async function login(email:string,password:string){const r=await request<{token:string;name:string;email:string}>('/auth/login',{method:'POST',body:JSON.stringify({email,password})});localStorage.setItem('agentforge_token',r.token);return r}
export async function register(name:string,email:string,password:string){const r=await request<{token:string;name:string;email:string}>('/auth/register',{method:'POST',body:JSON.stringify({name,email,password})});localStorage.setItem('agentforge_token',r.token);return r}
export function logout(){localStorage.removeItem('agentforge_token')}
export const me=()=>request<User>('/auth/me');
export const createTask=(prompt:string)=>request<Task>('/tasks',{method:'POST',body:JSON.stringify({prompt})});
export const history=()=>request<Task[]>('/tasks');
export const getTask=(id:number)=>request<Task>(`/tasks/${id}`);
export const provider=()=>request<{provider:string;model:string}>('/tasks/provider');
export const deleteTask = (id: number) =>
  request<void>(`/tasks/${id}`, { method: 'DELETE' });