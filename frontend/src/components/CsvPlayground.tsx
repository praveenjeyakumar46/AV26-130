import { DragEvent, useEffect, useMemo, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUpload, faTable, faFilter, faCopy, faRotateRight, faFileCsv } from '@fortawesome/free-solid-svg-icons';
import { toast } from '@/hooks/use-toast';

type ParsedCsv = {
  headers: string[];
  rows: string[][];
};

const SAMPLE_CSV = `Case,Category,Year,Outcome,Judge
ACME vs State,Corporate,2021,Settled,Justice Rao
People vs Patel,Criminal,2022,Convicted,Justice Iyer
LexCorp Merger,Corporate,2023,Approved,Justice Singh
Patel vs Union,Constitutional,2020,Pending,Justice Mehta
Estate of Nair,Civil,2024,Appealed,Justice Gupta`;

const parseCsv = (text: string): ParsedCsv => {
  const rows: string[][] = [];
  let current = '';
  let row: string[] = [];
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '"' && next === '"') {
      current += '"';
      i++;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === ',' && !inQuotes) {
      row.push(current.trim());
      current = '';
      continue;
    }

    if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && next === '\n') i++;
      row.push(current.trim());
      if (row.some((cell) => cell !== '')) {
        rows.push(row);
      }
      row = [];
      current = '';
      continue;
    }

    current += char;
  }

  if (current.length > 0 || row.length) {
    row.push(current.trim());
    if (row.some((cell) => cell !== '')) {
      rows.push(row);
    }
  }

  const [headerRow = [], ...dataRows] = rows;
  return { headers: headerRow, rows: dataRows };
};

const CsvPlayground = () => {
  const [csvName, setCsvName] = useState<string>('Sample dataset');
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [filter, setFilter] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  useEffect(() => {
    const parsed = parseCsv(SAMPLE_CSV);
    setHeaders(parsed.headers);
    setRows(parsed.rows);
    setCsvName('Sample dataset');
    toast({ description: `Loaded ${parsed.rows.length} sample rows` });
  }, []);

  const filteredRows = useMemo(() => {
    if (!filter) return rows;
    const term = filter.toLowerCase();
    return rows.filter((row) => row.some((cell) => cell.toLowerCase().includes(term)));
  }, [rows, filter]);

  const visibleRows = filteredRows.slice(0, 200);
  const isTruncated = filteredRows.length > visibleRows.length;

  const handleCsvText = (text: string, name: string) => {
    try {
      const parsed = parseCsv(text);
      if (!parsed.headers.length) {
        setError('No data found. Please upload a valid CSV file.');
        return;
      }
      setHeaders(parsed.headers);
      setRows(parsed.rows);
      setCsvName(name);
      setError(null);
      toast({ description: `Loaded ${parsed.rows.length} rows from ${name}` });
    } catch (e) {
      console.error(e);
      setError('Unable to read this CSV. Please check the format and try again.');
    }
  };

  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = (event.target?.result as string) || '';
      handleCsvText(text, file.name);
    };
    reader.readAsText(file);
  };

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragActive(false);
    const file = event.dataTransfer.files?.[0];
    if (file && (file.type.includes('csv') || file.name.toLowerCase().endsWith('.csv'))) {
      handleFile(file);
    } else {
      setError('Please drop a CSV file.');
    }
  };

  const copyFiltered = async () => {
    if (!headers.length) return;
    const serialized = [headers, ...filteredRows]
      .map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(','))
      .join('\n');
    try {
      await navigator.clipboard.writeText(serialized);
      toast({ description: 'Filtered data copied to clipboard' });
    } catch {
      setError('Clipboard access was blocked. Try again after allowing permission.');
    }
  };

  const reset = () => {
    setHeaders([]);
    setRows([]);
    setFilter('');
    setError(null);
    setCsvName('Upload a CSV');
  };

  return (
    <div className="min-h-screen bg-background text-foreground pt-20 pb-16">
      <div className="max-w-6xl mx-auto px-4 space-y-8">
        <div className="bg-card border border-border rounded-2xl shadow-lg p-8">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 rounded-xl gradient-primary shadow-glow flex items-center justify-center text-white">
                  <FontAwesomeIcon icon={faFileCsv} className="text-xl" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold">Interactive CSV Lab</h1>
                  <p className="text-muted-foreground">Upload, filter, and explore CSV data in the Purple Envy workspace.</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleCsvText(SAMPLE_CSV, 'Sample dataset')}
                className="px-4 py-2 rounded-lg bg-primary text-white shadow-glow hover:scale-105 transition-all duration-200 flex items-center space-x-2"
              >
                <FontAwesomeIcon icon={faTable} />
                <span>Load sample</span>
              </button>
              <button
                onClick={reset}
                className="px-4 py-2 rounded-lg border border-border hover:bg-muted transition-colors duration-200 flex items-center space-x-2 text-foreground"
              >
                <FontAwesomeIcon icon={faRotateRight} />
                <span>Reset</span>
              </button>
            </div>
          </div>
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragActive(true);
              }}
              onDragLeave={() => setDragActive(false)}
              onDrop={onDrop}
              className={`border-2 border-dashed rounded-xl p-6 transition-all duration-200 cursor-pointer ${
                dragActive ? 'border-primary bg-muted/50' : 'border-border bg-muted/30'
              }`}
              onClick={() => document.getElementById('csv-upload')?.click()}
            >
              <input
                id="csv-upload"
                type="file"
                accept=".csv"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFile(file);
                }}
              />
              <div className="flex items-center space-x-3 text-foreground">
                <div className="w-11 h-11 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                  <FontAwesomeIcon icon={faUpload} />
                </div>
                <div>
                  <p className="font-semibold">Drop a CSV file</p>
                  <p className="text-sm text-muted-foreground">or click to browse your computer</p>
                </div>
              </div>
              <p className="mt-4 text-sm text-muted-foreground">Supports headers, quoted values, and up to 200 rows displayed at once.</p>
              <p className="mt-2 text-xs text-muted-foreground">Current file: <span className="font-medium text-foreground">{csvName}</span></p>
            </div>

            <div className="bg-card border border-border rounded-xl p-6 shadow-md space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <FontAwesomeIcon icon={faFilter} className="text-primary" />
                  <span className="font-semibold">Filter rows</span>
                </div>
                {headers.length > 0 && (
                  <button
                    onClick={copyFiltered}
                    className="text-sm px-3 py-2 rounded-lg bg-primary text-white shadow-glow hover:scale-105 transition-all duration-200 flex items-center space-x-2"
                  >
                    <FontAwesomeIcon icon={faCopy} />
                    <span>Copy filtered</span>
                  </button>
                )}
              </div>
              <input
                type="text"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="Search across all columns..."
                className="w-full px-4 py-3 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="px-3 py-2 rounded-lg bg-muted text-foreground">
                  <p className="text-xs text-muted-foreground">Columns</p>
                  <p className="font-semibold">{headers.length || '—'}</p>
                </div>
                <div className="px-3 py-2 rounded-lg bg-muted text-foreground">
                  <p className="text-xs text-muted-foreground">Rows loaded</p>
                  <p className="font-semibold">{rows.length || '—'}</p>
                </div>
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-muted-foreground">Showing data for</p>
              <h2 className="text-xl font-semibold">{csvName}</h2>
            </div>
            {headers.length > 0 && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="px-3 py-1 rounded-full bg-muted text-foreground">Rows: {filteredRows.length}</span>
                <span className="px-3 py-1 rounded-full bg-muted text-foreground">Columns: {headers.length}</span>
              </div>
            )}
          </div>

          {headers.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <p>Load the sample dataset or upload your own CSV to get started.</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto border border-border rounded-xl">
                <table className="min-w-full divide-y divide-border text-sm">
                  <thead className="bg-muted/60">
                    <tr>
                      {headers.map((header, idx) => (
                        <th key={idx} className="px-4 py-3 text-left font-semibold text-foreground sticky top-0 bg-muted/80 backdrop-blur">
                          {header || `Column ${idx + 1}`}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {visibleRows.map((row, rowIndex) => (
                      <tr key={rowIndex} className="hover:bg-muted/60 transition-colors">
                        {headers.map((_, cellIndex) => (
                          <td key={cellIndex} className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                            {row[cellIndex] || '—'}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {isTruncated && (
                <p className="mt-3 text-sm text-muted-foreground">
                  Showing the first {visibleRows.length} of {filteredRows.length} filtered rows for performance. Refine your filter to narrow further.
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default CsvPlayground;

