import React, { useMemo, useState } from 'react';
import { USE_CASES } from '@/data/useCases';

const UseCasesPage = () => {
    const [filterModule, setFilterModule] = useState('');
    const [search, setSearch] = useState('');

    const modules = useMemo(() => [...new Set(USE_CASES.map((u) => u.module))].sort(), []);

    const filtered = useMemo(() => {
        return USE_CASES.filter((u) => {
            const matchModule = !filterModule || u.module === filterModule;
            const matchSearch =
                !search.trim() ||
                u.useCase.toLowerCase().includes(search.toLowerCase()) ||
                u.description.toLowerCase().includes(search.toLowerCase()) ||
                u.module.toLowerCase().includes(search.toLowerCase());
            return matchModule && matchSearch;
        });
    }, [filterModule, search]);

    return (
        <div className="flex-1 min-h-0 p-6 bg-base-200 overflow-y-auto">
            <div className="container mx-auto space-y-4">
                <h1 className="text-2xl font-bold text-base-content">Use Cases</h1>

                <div className="flex flex-wrap gap-2 items-center">
                    <div>
                        <label className="label py-0 text-xs">Tìm kiếm</label>
                        <input
                            type="text"
                            placeholder="Use case, mô tả, module..."
                            className="input input-bordered input-sm w-48"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="label py-0 text-xs">Module</label>
                        <select
                            className="select select-bordered select-sm w-40"
                            value={filterModule}
                            onChange={(e) => setFilterModule(e.target.value)}
                        >
                            <option value="">Tất cả module</option>
                            {modules.map((m) => (
                                <option key={m} value={m}>
                                    {m}
                                </option>
                            ))}
                        </select>
                    </div>
                    <span className="flex items-end text-sm text-base-content/60">
                        {filtered.length} / {USE_CASES.length} use cases
                    </span>
                </div>

                <div className="bg-base-100 rounded-lg shadow-lg">
                    <div className="overflow-x-auto overflow-y-auto max-h-[700px]">
                        <table className="table w-full">
                            <thead className="bg-blue-100 sticky top-0 z-20 border-b-2 border-base-300">
                                <tr>
                                    <th className="w-16 font-medium text-neutral text-xs py-3">#</th>
                                    <th className="font-medium text-neutral text-xs py-3">Module</th>
                                    <th className="font-medium text-neutral text-xs py-3">Use Case</th>
                                    <th className="font-medium text-neutral text-xs py-3">Mô tả</th>
                                </tr>
                            </thead>
                            <tbody className="text-xs">
                                {filtered.map((uc) => (
                                    <tr key={uc.id} className="hover:bg-base-200/60 transition-colors font-light">
                                        <td className="py-3 font-mono">{uc.id}</td>
                                        <td className="py-3 font-medium">{uc.module}</td>
                                        <td className="py-3">{uc.useCase}</td>
                                        <td className="py-3 text-base-content/80">{uc.description}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                <p className="text-xs text-base-content/50">
                    Nguồn: <code className="bg-base-300 px-1 rounded">client/src/data/useCases.js</code>
                </p>
            </div>
        </div>
    );
};

export default UseCasesPage;
