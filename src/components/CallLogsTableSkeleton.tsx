export function CallLogsTableSkeleton() {
  const columns = ['', 'Call ID', 'Agent', 'Lead', 'Type', 'Status', 'Started', 'Duration', 'Tags', 'Cost', ''];
  
  return (
    <div className="glass-card rounded-2xl overflow-hidden">
      <table className="w-full">
        <thead className="bg-muted/30">
          <tr>
            {columns.map((col, i) => (
              <th key={i} className="px-4 py-3 text-left font-semibold text-[#1E293B]">
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="animate-pulse">
          {Array.from({ length: 8 }).map((_, row) => (
            <tr key={row} className="border-b">
              {columns.map((_, col) => (
                <td key={col} className="px-4 py-4">
                  <div className="h-4 w-full bg-muted rounded" />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
