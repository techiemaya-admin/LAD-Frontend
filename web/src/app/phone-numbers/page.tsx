// "use client";
// import { useEffect, useState } from "react";
// import { apiGet } from "@/lib/api";
// import { CreateNumberClient } from "@/components/create-number-client";
// export type PhoneNumber = {
//   id: string;
//   e164: string;
//   label?: string;
//   provider?: string;
//   sid?: string;
//   account?: string;
// };
// export default function PhoneNumbersPage() {
//   const [items, setItems] = useState<PhoneNumber[]>([]);
//   const [search, setSearch] = useState("");
//   const [filterProvider, setFilterProvider] = useState("All");
//   useEffect(() => {
//     async function fetchData() {
//       const { items } = await apiGet<{ items: PhoneNumber[] }>("/api/phoneNumbers");
//       setItems(items);
//     }
//     fetchData();
//   }, []);
//   const filteredItems = items.filter((n) => {
//     const matchesSearch =
//       n.label?.toLowerCase().includes(search.toLowerCase()) ||
//       n.e164.toLowerCase().includes(search.toLowerCase()) ||
//       n.provider?.toLowerCase().includes(search.toLowerCase()) ||
//       n.account?.toLowerCase().includes(search.toLowerCase()) ||
//       n.sid?.toLowerCase().includes(search.toLowerCase());
//     const matchesProvider =
//       filterProvider === "All" || n.provider === filterProvider;
//     return matchesSearch && matchesProvider;
//   });
//   const uniqueProviders = Array.from(new Set(items.map((n) => n.provider))).filter(Boolean);
//   return (
//     <div className="min-h-screen bg-gradient-to-br from-gray-50 via-gray-100 to-gray-200 dark:from-[#0a0a0a] dark:via-[#111111] dark:to-[#1a1a1a] p-8 transition-all duration-500">
//       <div className="max-w-7xl mx-auto space-y-8">
//         {/* Header */}
//         <div className="flex flex-col sm:flex-row sm:items-center justify-between backdrop-blur-md bg-white/60 dark:bg-white/10 shadow-lg rounded-2xl px-6 py-5 border border-white/40 dark:border-white/10 transition-all duration-500 hover:shadow-xl hover:-translate-y-[1px]">
//           <h1 className="text-3xl font-semibold text-gray-900 dark:text-gray-100 tracking-tight mb-3 sm:mb-0">
//             📱 Phone Numbers
//           </h1>
//           <div className="transition-transform duration-300 hover:scale-105">
//             <CreateNumberClient />
//           </div>
//         </div>
//         {/* Filters */}
//         <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-white/60 dark:bg-white/10 p-4 rounded-2xl border border-white/40 dark:border-white/10 shadow-md backdrop-blur-md">
//           <input
//             type="text"
//             placeholder="🔍 Search by label, provider, SID, or account..."
//             value={search}
//             onChange={(e) => setSearch(e.target.value)}
//             className="w-full sm:w-1/2 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 focus:ring-2 focus:ring-blue-500 outline-none bg-white/80 dark:bg-gray-900/50 text-gray-900 dark:text-gray-200"
//           />
//           <select
//             value={filterProvider}
//             onChange={(e) => setFilterProvider(e.target.value)}
//             className="w-full sm:w-1/4 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 focus:ring-2 focus:ring-blue-500 outline-none bg-white/80 dark:bg-gray-900/50 text-gray-900 dark:text-gray-200"
//           >
//             <option value="All">All Providers</option>
//             {uniqueProviders.map((p) => (
//               <option key={p} value={p}>
//                 {p}
//               </option>
//             ))}
//           </select>
//         </div>
//         {/* Table */}
//         <div className="overflow-hidden rounded-2xl backdrop-blur-lg bg-white/70 dark:bg-white/5 border border-white/30 dark:border-white/10 shadow-2xl transition-all duration-500 hover:shadow-3xl">
//           <table className="w-full text-base text-gray-800 dark:text-gray-200">
//             <thead className="bg-gradient-to-r from-gray-100/80 to-gray-50/80 dark:from-white/10 dark:to-white/5 text-left text-gray-600 dark:text-gray-300 uppercase text-xs tracking-wider">
//               <tr>
//                 <th className="p-5">Label</th>
//                 <th className="p-5">E.164</th>
//                 <th className="p-5">Provider</th>
//                 <th className="p-5">SID</th>
//                 <th className="p-5">Account</th>
//               </tr>
//             </thead>
//             <tbody className="backdrop-blur-sm">
//               {filteredItems.length === 0 ? (
//                 <tr>
//                   <td
//                     colSpan={5}
//                     className="p-8 text-center text-gray-500 dark:text-gray-400"
//                   >
//                     No matching phone numbers found.
//                   </td>
//                 </tr>
//               ) : (
//                 filteredItems.map((n, i) => (
//                   <tr
//                     key={n.id}
//                     className={`border-t border-white/30 dark:border-white/10 hover:bg-white/60 dark:hover:bg-white/10 transition-all duration-300 ${
//                       i % 2 === 0 ? "bg-white/40 dark:bg-white/[0.03]" : ""
//                     }`}
//                   >
//                     <td className="p-5 font-medium">{n.label || "—"}</td>
//                     <td className="p-5 font-mono">{n.e164}</td>
//                     <td className="p-5 capitalize">{n.provider || "—"}</td>
//                     <td className="p-5 font-mono">{n.sid || "—"}</td>
//                     <td className="p-5 font-mono">{n.account || "—"}</td>
//                   </tr>
//                 ))
//               )}
//             </tbody>
//           </table>
//         </div>
//       </div>
//     </div>
//   );
// } 
"use client";
import { useCallback, useEffect, useState } from "react";
import { apiGet } from "@/lib/api";
import { CreateNumberClient } from "@/components/create-number-client";
export type PhoneNumber = {
  id: string;
  phone_number: string;
  label?: string;
  provider?: string;
  sid?: string;
  account?: string;
  type?: string;
  status?: string;
  created_at?: string;
};
export default function PhoneNumbersPage() {
  const [items, setItems] = useState<PhoneNumber[]>([]);
  const [search, setSearch] = useState("");
  const [filterProvider, setFilterProvider] = useState("All");
  const fetchData = useCallback(async () => {
    const response = await apiGet<{ success: boolean; numbers: PhoneNumber[] }>("/api/voice-agent/numbers");
    if (response.success) {
      setItems(response.numbers);
    }
  }, []);
  useEffect(() => {
    fetchData();
  }, [fetchData]);
  const filteredItems = items.filter((n) => {
    const searchLower = search.toLowerCase();
    const matchesSearch =
      n.label?.toLowerCase().includes(searchLower) ||
      n.phone_number?.toLowerCase().includes(searchLower) ||
      n.provider?.toLowerCase().includes(searchLower) ||
      n.account?.toLowerCase().includes(searchLower) ||
      n.sid?.toLowerCase().includes(searchLower) ||
      n.type?.toLowerCase().includes(searchLower) ||
      n.status?.toLowerCase().includes(searchLower);
    const matchesProvider =
      filterProvider === "All" || n.provider === filterProvider;
    return matchesSearch && matchesProvider;
  });
  const uniqueProviders = Array.from(new Set(items.map((n) => n.provider))).filter(Boolean);
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-gray-100 to-gray-200 dark:from-[#0a0a0a] dark:via-[#111111] dark:to-[#1a1a1a] p-10 transition-all duration-500">
      <div className="max-w-7xl mx-auto space-y-10">
        {/* Header */}
        {/* <div className="flex flex-col sm:flex-row sm:items-center justify-between backdrop-blur-md bg-white/70 dark:bg-white/10 shadow-xl rounded-3xl px-8 py-7 border border-white/40 dark:border-white/10 transition-all duration-500 hover:shadow-2xl hover:-translate-y-[2px]">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 tracking-tight mb-4 sm:mb-0">
            📱 Phone Numbers
          </h1>
          <div className="transition-transform duration-300 hover:scale-110">
            <CreateNumberClient onCreated={fetchData} />
          </div>
        </div> */}
         <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-gradient-to-r from-blue-50 via-white to-purple-50 dark:from-gray-800 dark:via-gray-900 dark:to-gray-800 shadow-lg rounded-3xl px-8 py-6 border border-gray-200 dark:border-gray-700">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">
            ✆ Phone Numbers
          </h1>
          <div className="transition-transform duration-300 hover:scale-110">
            <CreateNumberClient onCreated={fetchData} />
          </div>
        </div>
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-6 items-center justify-between bg-white/70 dark:bg-white/10 p-6 rounded-3xl border border-white/40 dark:border-white/10 shadow-lg backdrop-blur-md">
          <input
            type="text"
            placeholder="🔍 Search by label, provider, SID, or account..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full sm:w-2/3 px-5 py-3 text-lg rounded-xl border border-gray-300 dark:border-gray-700 focus:ring-2 focus:ring-blue-500 outline-none bg-white/80 dark:bg-gray-900/50 text-gray-900 dark:text-gray-200"
          />
          <select
            value={filterProvider}
            onChange={(e) => setFilterProvider(e.target.value)}
            className="w-full sm:w-1/3 px-4 py-3 text-lg rounded-xl border border-gray-300 dark:border-gray-700 focus:ring-2 focus:ring-blue-500 outline-none bg-white/80 dark:bg-gray-900/50 text-gray-900 dark:text-gray-200"
          >
            <option value="All">All Providers</option>
            {uniqueProviders.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>
        {/* Table */}
        <div className="overflow-hidden rounded-3xl backdrop-blur-xl bg-white/80 dark:bg-white/5 border border-white/30 dark:border-white/10 shadow-3xl transition-all duration-500 hover:shadow-4xl">
          <table className="w-full text-lg text-gray-800 dark:text-gray-200">
            <thead className="bg-gradient-to-r from-gray-100/90 to-gray-50/90 dark:from-white/10 dark:to-white/5 text-left text-gray-600 dark:text-gray-300 uppercase text-sm tracking-widest">
              <tr>
                <th className="p-6">id</th>
                <th className="p-6">Phone Number</th>
                <th className="p-6">Provider</th>
                <th className="p-6">Status</th>
                <th className="p-6">Type</th>
              </tr>
            </thead>
            <tbody className="backdrop-blur-sm text-[1.05rem]">
              {filteredItems.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="p-10 text-center text-gray-500 dark:text-gray-400 text-lg"
                  >
                    No matching phone numbers found.
                  </td>
                </tr>
              ) : (
                filteredItems.map((n, i) => (
                  <tr
                    key={n.id}
                    className={`border-t border-white/30 dark:border-white/10 hover:bg-white/60 dark:hover:bg-white/10 transition-all duration-300 ${
                      i % 2 === 0 ? "bg-white/50 dark:bg-white/[0.03]" : ""
                    }`}
                  >
                    <td className="p-6 font-semibold">{n.id || "—"}</td>
                    <td className="p-6 font-mono">{n.phone_number}</td>
                    <td className="p-6 capitalize">{n.provider || "—"}</td>
                    <td className="p-6 font-mono">{n.status || "—"}</td>
                    <td className="p-6 font-mono">{n.type || "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}