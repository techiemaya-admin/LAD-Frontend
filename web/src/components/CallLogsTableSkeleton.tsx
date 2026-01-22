export function CallLogsTableSkeleton() {
  return (
    <div className="glass-card rounded-2xl overflow-hidden animate-pulse">
      <table className="w-full">
        <thead className="bg-muted/30">
          <tr>
            {Array.from({ length: 10 }).map((_, i) => (
              <th key={i} className="px-4 py-3">
                <div className="h-4 w-24 bg-muted rounded" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: 8 }).map((_, row) => (
            <tr key={row} className="border-b">
              {Array.from({ length: 10 }).map((_, col) => (
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