"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export function AdminJsonTable({ items, columns }: { items: any[]; columns: { key: string; label: string }[] }) {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((c) => (
              <TableHead key={c.key}>{c.label}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((it, idx) => (
            <TableRow key={it?.id || idx}>
              {columns.map((c) => (
                <TableCell key={c.key} className="align-top">
                  {(() => {
                    const v = it?.[c.key];
                    if (v === null || v === undefined) return "";
                    if (typeof v === "object") return <pre className="text-xs whitespace-pre-wrap">{JSON.stringify(v, null, 2)}</pre>;
                    return String(v);
                  })()}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
