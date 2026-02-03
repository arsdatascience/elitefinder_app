import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Users, Building2, Shield, BarChart3, Plus, LogOut, Bot, Save } from 'lucide-react';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';

interface User {
    id_usuario: number;
    nome: string;
    email: string;
    role: string;
    tenant_nome: string;
    ativo: boolean;
}

interface Tenant {
    id_tenant: number;
    nome: string;
    slug: string;
    ativo: boolean;
    total_usuarios: number;
}

interface Stats {
    totalUsuarios: number;
    totalAtendimentos: number;
    totalAnalises: number;
}

interface Role {
    id_role: number;
    nome: string;
    descricao: string;
}

interface AgentConfig {
    id?: number;
    provider: string;
    model: string;
    temperature: number;
    max_tokens: number;
    system_prompt: string;
    is_active: boolean;
}

export default function Admin() {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<'stats' | 'users' | 'tenants' | 'agents'>('stats');
    const [users, setUsers] = useState<User[]>([]);
    const [tenants, setTenants] = useState<Tenant[]>([]);
    const [roles, setRoles] = useState<Role[]>([]);
    const [agentConfigs, setAgentConfigs] = useState<AgentConfig[]>([]);
    const [stats, setStats] = useState<Stats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [currentUser, setCurrentUser] = useState<any>(null);

    // Form states
    const [showUserForm, setShowUserForm] = useState(false);
    const [showTenantForm, setShowTenantForm] = useState(false);
    const [newUser, setNewUser] = useState({ nome: '', email: '', senha: '', roleId: 3 });
    const [newTenant, setNewTenant] = useState({ nome: '', slug: '' });

    const token = localStorage.getItem('token');

    useEffect(() => {
        if (!token) {
            navigate('/login');
            return;
        }
        fetchCurrentUser();
        fetchStats();
        fetchRoles();
    }, [token]);

    useEffect(() => {
        if (activeTab === 'users') fetchUsers();
        if (activeTab === 'tenants') fetchTenants();
        if (activeTab === 'agents') fetchAgentConfigs();
    }, [activeTab]);

    const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    };

    async function fetchCurrentUser() {
        try {
            const res = await fetch(`${BACKEND_URL}/api/auth/me`, { headers });
            if (!res.ok) throw new Error('Unauthorized');
            const data = await res.json();
            setCurrentUser(data.user);
        } catch {
            localStorage.removeItem('token');
            navigate('/login');
        }
    }

    async function fetchStats() {
        try {
            const res = await fetch(`${BACKEND_URL}/api/admin/stats`, { headers });
            if (res.ok) {
                const data = await res.json();
                setStats(data.stats);
            }
        } catch (err) {
            console.error('Erro ao buscar stats:', err);
        } finally {
            setLoading(false);
        }
    }

    async function fetchUsers() {
        try {
            const res = await fetch(`${BACKEND_URL}/api/admin/users`, { headers });
            if (res.ok) {
                const data = await res.json();
                setUsers(data.users);
            }
        } catch (err) {
            console.error('Erro ao buscar usuários:', err);
        }
    }

    async function fetchTenants() {
        try {
            const res = await fetch(`${BACKEND_URL}/api/admin/tenants`, { headers });
            if (res.ok) {
                const data = await res.json();
                setTenants(data.tenants);
            }
        } catch (err) {
            console.error('Erro ao buscar tenants:', err);
        }
    }

    async function fetchRoles() {
        try {
            const res = await fetch(`${BACKEND_URL}/api/admin/roles`, { headers });
            if (res.ok) {
                const data = await res.json();
                setRoles(data.roles);
            }
        } catch (err) {
            console.error('Erro ao buscar roles:', err);
        }
    }

    async function fetchAgentConfigs() {
        try {
            const AI_URL = import.meta.env.VITE_AI_SERVICE_URL || 'http://localhost:8000';
            // Note: Using internal API key or placeholder.
            // Ensure VITE_AI_API_KEY is set in your .env file
            const res = await fetch(`${AI_URL}/admin/config`, {
                headers: {
                    'x-api-key': import.meta.env.VITE_AI_API_KEY || 'dev_secret_key_placeholder',
                    'Content-Type': 'application/json'
                }
            });

            if (res.ok) {
                const data = await res.json();
                setAgentConfigs(data);
            }
        } catch (err) {
            console.error('Erro ao buscar configs agentes:', err);
        }
    }

    async function handleSaveConfig(config: AgentConfig) {
        try {
            const AI_URL = import.meta.env.VITE_AI_SERVICE_URL || 'http://localhost:8000';
            const res = await fetch(`${AI_URL}/admin/config`, {
                method: 'POST',
                headers: {
                    'x-api-key': import.meta.env.VITE_AI_API_KEY || 'dev_secret_key_placeholder',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(config)
            });

            if (res.ok) {
                fetchAgentConfigs();
                alert('Configuração salva com sucesso!');
            } else {
                throw new Error('Falha ao salvar');
            }
        } catch (err: any) {
            setError(err.message);
        }
    }

    async function handleCreateUser(e: React.FormEvent) {
        e.preventDefault();
        setError('');
        try {
            const res = await fetch(`${BACKEND_URL}/api/admin/users`, {
                method: 'POST',
                headers,
                body: JSON.stringify(newUser)
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error);
            }
            setShowUserForm(false);
            setNewUser({ nome: '', email: '', senha: '', roleId: 3 });
            fetchUsers();
        } catch (err: any) {
            setError(err.message);
        }
    }

    async function handleCreateTenant(e: React.FormEvent) {
        e.preventDefault();
        setError('');
        try {
            const res = await fetch(`${BACKEND_URL}/api/admin/tenants`, {
                method: 'POST',
                headers,
                body: JSON.stringify(newTenant)
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error);
            }
            setShowTenantForm(false);
            setNewTenant({ nome: '', slug: '' });
            fetchTenants();
        } catch (err: any) {
            setError(err.message);
        }
    }

    async function toggleUserStatus(userId: number, currentStatus: boolean) {
        try {
            await fetch(`${BACKEND_URL}/api/admin/users/${userId}`, {
                method: 'PATCH',
                headers,
                body: JSON.stringify({ ativo: !currentStatus })
            });
            fetchUsers();
        } catch (err) {
            console.error('Erro ao atualizar usuário:', err);
        }
    }

    function handleLogout() {
        localStorage.removeItem('token');
        navigate('/login');
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
                <div className="text-white text-xl">Carregando...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
            {/* Header */}
            <header className="bg-black/30 backdrop-blur-md border-b border-white/10 px-6 py-4">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Shield className="w-8 h-8 text-emerald-400" />
                        <div>
                            <h1 className="text-xl font-bold text-white">Elite Finder Admin</h1>
                            {currentUser && (
                                <p className="text-sm text-gray-400">
                                    {currentUser.nome} • {currentUser.role} • {currentUser.tenant?.nome}
                                </p>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" onClick={() => navigate('/')} className="text-gray-300 hover:text-white">
                            Dashboard
                        </Button>
                        <Button variant="ghost" onClick={handleLogout} className="text-red-400 hover:text-red-300">
                            <LogOut className="w-4 h-4 mr-2" />
                            Sair
                        </Button>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-6 py-8">
                {error && (
                    <div className="mb-4 p-4 bg-red-500/20 border border-red-500 rounded-lg text-red-300">
                        {error}
                    </div>
                )}

                {/* Tabs */}
                <div className="flex gap-2 mb-6">
                    <Button
                        variant={activeTab === 'stats' ? 'default' : 'outline'}
                        onClick={() => setActiveTab('stats')}
                        className={activeTab === 'stats' ? 'bg-emerald-600' : ''}
                    >
                        <BarChart3 className="w-4 h-4 mr-2" />
                        Estatísticas
                    </Button>
                    <Button
                        variant={activeTab === 'users' ? 'default' : 'outline'}
                        onClick={() => setActiveTab('users')}
                        className={activeTab === 'users' ? 'bg-emerald-600' : ''}
                    >
                        <Users className="w-4 h-4 mr-2" />
                        Usuários
                    </Button>
                    {currentUser?.role === 'admin' && (
                        <Button
                            variant={activeTab === 'tenants' ? 'default' : 'outline'}
                            onClick={() => setActiveTab('tenants')}
                            className={activeTab === 'tenants' ? 'bg-emerald-600' : ''}
                        >
                            <Building2 className="w-4 h-4 mr-2" />
                            Tenants
                        </Button>
                    )}
                    <Button
                        variant={activeTab === 'agents' ? 'default' : 'outline'}
                        onClick={() => setActiveTab('agents')}
                        className={activeTab === 'agents' ? 'bg-emerald-600' : ''}
                    >
                        <Bot className="w-4 h-4 mr-2" />
                        Agentes IA
                    </Button>
                </div>

                {/* Stats Tab */}
                {
                    activeTab === 'stats' && stats && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <Card className="bg-white/5 border-white/10">
                                <CardHeader className="flex flex-row items-center justify-between pb-2">
                                    <CardTitle className="text-sm font-medium text-gray-400">Usuários</CardTitle>
                                    <Users className="w-4 h-4 text-emerald-400" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-3xl font-bold text-white">{stats.totalUsuarios}</div>
                                </CardContent>
                            </Card>
                            <Card className="bg-white/5 border-white/10">
                                <CardHeader className="flex flex-row items-center justify-between pb-2">
                                    <CardTitle className="text-sm font-medium text-gray-400">Atendimentos</CardTitle>
                                    <BarChart3 className="w-4 h-4 text-blue-400" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-3xl font-bold text-white">{stats.totalAtendimentos}</div>
                                </CardContent>
                            </Card>
                            <Card className="bg-white/5 border-white/10">
                                <CardHeader className="flex flex-row items-center justify-between pb-2">
                                    <CardTitle className="text-sm font-medium text-gray-400">Análises</CardTitle>
                                    <Shield className="w-4 h-4 text-purple-400" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-3xl font-bold text-white">{stats.totalAnalises}</div>
                                </CardContent>
                            </Card>
                        </div>
                    )
                }

                {/* Users Tab */}
                {
                    activeTab === 'users' && (
                        <div>
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-xl font-bold text-white">Gerenciar Usuários</h2>
                                <Button onClick={() => setShowUserForm(true)} className="bg-emerald-600 hover:bg-emerald-700">
                                    <Plus className="w-4 h-4 mr-2" />
                                    Novo Usuário
                                </Button>
                            </div>

                            {showUserForm && (
                                <Card className="bg-white/5 border-white/10 mb-6">
                                    <CardContent className="pt-6">
                                        <form onSubmit={handleCreateUser} className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                            <Input
                                                placeholder="Nome"
                                                value={newUser.nome}
                                                onChange={(e) => setNewUser({ ...newUser, nome: e.target.value })}
                                                className="bg-white/10 border-white/20 text-white"
                                                required
                                            />
                                            <Input
                                                type="email"
                                                placeholder="Email"
                                                value={newUser.email}
                                                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                                                className="bg-white/10 border-white/20 text-white"
                                                required
                                            />
                                            <Input
                                                type="password"
                                                placeholder="Senha"
                                                value={newUser.senha}
                                                onChange={(e) => setNewUser({ ...newUser, senha: e.target.value })}
                                                className="bg-white/10 border-white/20 text-white"
                                                required
                                            />
                                            <div className="flex gap-2">
                                                <select
                                                    value={newUser.roleId}
                                                    onChange={(e) => setNewUser({ ...newUser, roleId: parseInt(e.target.value) })}
                                                    className="flex-1 bg-white/10 border border-white/20 rounded-md px-3 text-white"
                                                >
                                                    {roles.map((role) => (
                                                        <option key={role.id_role} value={role.id_role} className="bg-gray-800">
                                                            {role.nome}
                                                        </option>
                                                    ))}
                                                </select>
                                                <Button type="submit" className="bg-emerald-600">Criar</Button>
                                                <Button type="button" variant="ghost" onClick={() => setShowUserForm(false)}>
                                                    Cancelar
                                                </Button>
                                            </div>
                                        </form>
                                    </CardContent>
                                </Card>
                            )}

                            <Card className="bg-white/5 border-white/10">
                                <CardContent className="pt-6">
                                    <div className="overflow-x-auto">
                                        <table className="w-full">
                                            <thead>
                                                <tr className="text-left text-gray-400 border-b border-white/10">
                                                    <th className="pb-3">Nome</th>
                                                    <th className="pb-3">Email</th>
                                                    <th className="pb-3">Role</th>
                                                    <th className="pb-3">Tenant</th>
                                                    <th className="pb-3">Status</th>
                                                    <th className="pb-3">Ações</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {users.map((user) => (
                                                    <tr key={user.id_usuario} className="border-b border-white/5 text-white">
                                                        <td className="py-3">{user.nome}</td>
                                                        <td className="py-3 text-gray-400">{user.email}</td>
                                                        <td className="py-3">
                                                            <span className={`px-2 py-1 rounded text-xs ${user.role === 'admin' ? 'bg-purple-500/20 text-purple-300' :
                                                                user.role === 'gerente' ? 'bg-blue-500/20 text-blue-300' :
                                                                    'bg-gray-500/20 text-gray-300'
                                                                }`}>
                                                                {user.role}
                                                            </span>
                                                        </td>
                                                        <td className="py-3 text-gray-400">{user.tenant_nome}</td>
                                                        <td className="py-3">
                                                            <span className={`px-2 py-1 rounded text-xs ${user.ativo ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'
                                                                }`}>
                                                                {user.ativo ? 'Ativo' : 'Inativo'}
                                                            </span>
                                                        </td>
                                                        <td className="py-3">
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                onClick={() => toggleUserStatus(user.id_usuario, user.ativo)}
                                                                className={user.ativo ? 'text-red-400' : 'text-emerald-400'}
                                                            >
                                                                {user.ativo ? 'Desativar' : 'Ativar'}
                                                            </Button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    )
                }

                {/* Tenants Tab */}
                {
                    activeTab === 'tenants' && (
                        <div>
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-xl font-bold text-white">Gerenciar Tenants</h2>
                                <Button onClick={() => setShowTenantForm(true)} className="bg-emerald-600 hover:bg-emerald-700">
                                    <Plus className="w-4 h-4 mr-2" />
                                    Novo Tenant
                                </Button>
                            </div>

                            {showTenantForm && (
                                <Card className="bg-white/5 border-white/10 mb-6">
                                    <CardContent className="pt-6">
                                        <form onSubmit={handleCreateTenant} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <Input
                                                placeholder="Nome do Tenant"
                                                value={newTenant.nome}
                                                onChange={(e) => setNewTenant({ ...newTenant, nome: e.target.value })}
                                                className="bg-white/10 border-white/20 text-white"
                                                required
                                            />
                                            <Input
                                                placeholder="Slug (ex: minha-empresa)"
                                                value={newTenant.slug}
                                                onChange={(e) => setNewTenant({ ...newTenant, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
                                                className="bg-white/10 border-white/20 text-white"
                                                required
                                            />
                                            <div className="flex gap-2">
                                                <Button type="submit" className="bg-emerald-600">Criar</Button>
                                                <Button type="button" variant="ghost" onClick={() => setShowTenantForm(false)}>
                                                    Cancelar
                                                </Button>
                                            </div>
                                        </form>
                                    </CardContent>
                                </Card>
                            )}

                            <Card className="bg-white/5 border-white/10">
                                <CardContent className="pt-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {tenants.map((tenant) => (
                                            <Card key={tenant.id_tenant} className="bg-white/5 border-white/10">
                                                <CardHeader>
                                                    <CardTitle className="text-white flex items-center gap-2">
                                                        <Building2 className="w-5 h-5 text-emerald-400" />
                                                        {tenant.nome}
                                                    </CardTitle>
                                                </CardHeader>
                                                <CardContent>
                                                    <p className="text-gray-400 text-sm mb-2">Slug: {tenant.slug}</p>
                                                    <p className="text-gray-400 text-sm mb-2">Usuários: {tenant.total_usuarios}</p>
                                                    <span className={`px-2 py-1 rounded text-xs ${tenant.ativo ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'
                                                        }`}>
                                                        {tenant.ativo ? 'Ativo' : 'Inativo'}
                                                    </span>
                                                </CardContent>
                                            </Card>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    )
                }

                {/* Agents Tab */}
                {
                    activeTab === 'agents' && (
                        <div className="grid grid-cols-1 gap-6">
                            <h2 className="text-xl font-bold text-white mb-4">Configuração dos Agentes (LLMs)</h2>
                            <p className="text-gray-400 mb-6">Ajuste os parâmetros de cada provedor. O sistema usará estas configurações em tempo real.</p>

                            {['openai', 'anthropic', 'gemini'].map(provider => {
                                const config = agentConfigs.find(c => c.provider === provider) || {
                                    provider,
                                    model: provider === 'openai' ? 'gpt-5.2-mini' : provider === 'anthropic' ? 'claude-4.5-sonnet' : 'gemini-3.0-pro',
                                    temperature: 0.7,
                                    max_tokens: 2000,
                                    system_prompt: '',
                                    is_active: true
                                };

                                return (
                                    <Card key={provider} className="bg-white/5 border-white/10">
                                        <CardHeader>
                                            <CardTitle className="text-white flex items-center gap-2 capitalize">
                                                <Bot className="w-5 h-5 text-emerald-400" />
                                                {provider} Config
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div>
                                                    <label className="text-sm text-gray-400 block mb-1">Modelo</label>
                                                    <Input
                                                        className="bg-white/10 border-white/20 text-white"
                                                        value={config.model}
                                                        onChange={(e) => {
                                                            const newConfigs = [...agentConfigs];
                                                            const idx = newConfigs.findIndex(c => c.provider === provider);
                                                            if (idx >= 0) newConfigs[idx].model = e.target.value;
                                                            else newConfigs.push({ ...config, model: e.target.value });
                                                            setAgentConfigs(newConfigs);
                                                        }}
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-sm text-gray-400 block mb-1">Temperatura (0.0 - 1.0)</label>
                                                    <Input
                                                        type="number" step="0.1" min="0" max="1"
                                                        className="bg-white/10 border-white/20 text-white"
                                                        value={config.temperature}
                                                        onChange={(e) => {
                                                            const newConfigs = [...agentConfigs];
                                                            const idx = newConfigs.findIndex(c => c.provider === provider);
                                                            if (idx >= 0) newConfigs[idx].temperature = parseFloat(e.target.value);
                                                            else newConfigs.push({ ...config, temperature: parseFloat(e.target.value) });
                                                            setAgentConfigs(newConfigs);
                                                        }}
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-sm text-gray-400 block mb-1">Max Tokens</label>
                                                    <Input
                                                        type="number"
                                                        className="bg-white/10 border-white/20 text-white"
                                                        value={config.max_tokens}
                                                        onChange={(e) => {
                                                            const newConfigs = [...agentConfigs];
                                                            const idx = newConfigs.findIndex(c => c.provider === provider);
                                                            if (idx >= 0) newConfigs[idx].max_tokens = parseInt(e.target.value);
                                                            else newConfigs.push({ ...config, max_tokens: parseInt(e.target.value) });
                                                            setAgentConfigs(newConfigs);
                                                        }}
                                                    />
                                                </div>
                                                <div className="col-span-1 md:col-span-2">
                                                    <label className="text-sm text-gray-400 block mb-1">System Prompt / Meta-Prompt</label>
                                                    <textarea
                                                        className="w-full bg-white/10 border border-white/20 text-white rounded-md p-3 min-h-[100px]"
                                                        value={config.system_prompt || ''}
                                                        onChange={(e) => {
                                                            const newConfigs = [...agentConfigs];
                                                            const idx = newConfigs.findIndex(c => c.provider === provider);
                                                            if (idx >= 0) newConfigs[idx].system_prompt = e.target.value;
                                                            else newConfigs.push({ ...config, system_prompt: e.target.value });
                                                            setAgentConfigs(newConfigs);
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                            <div className="mt-4 flex justify-end">
                                                <Button onClick={() => handleSaveConfig(config)} className="bg-emerald-600 hover:bg-emerald-700">
                                                    <Save className="w-4 h-4 mr-2" />
                                                    Salvar Configuração {provider}
                                                </Button>
                                            </div>
                                        </CardContent>
                                    </Card>
                                );
                            })}
                        </div>
                    )
                }
            </main>
        </div>
    );
}
