import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { Card, Button } from './ui';

const DatabaseManager = () => {
  const [selectedTable, setSelectedTable] = useState('');
  const [queryResult, setQueryResult] = useState(null);

  // Fetch database tables
  const { data: tables, isLoading: tablesLoading } = useQuery({
    queryKey: ['database-tables'],
    queryFn: async () => {
      const response = await axios.get('/api/database/tables');
      return response.data;
    }
  });

  // Fetch table data
  const fetchTableData = async (tableName) => {
    try {
      const response = await axios.get(`/api/database/table/${tableName}`);
      setQueryResult(response.data);
      setSelectedTable(tableName);
    } catch (error) {
      console.error('Error fetching table data:', error);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Database Browser</h3>
        
        {/* Tables List */}
        <div className="mb-6">
          <h4 className="font-medium mb-2">Database Tables:</h4>
          {tablesLoading ? (
            <p>Loading tables...</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
              {tables?.map((table) => (
                <Button
                  key={table}
                  onClick={() => fetchTableData(table)}
                  variant={selectedTable === table ? "default" : "outline"}
                  size="sm"
                  className="text-left"
                >
                  {table}
                </Button>
              ))}
            </div>
          )}
        </div>

        {/* Table Data */}
        {queryResult && (
          <div className="mt-6">
            <h4 className="font-medium mb-2">
              Table: {selectedTable} ({queryResult.length} rows)
            </h4>
            <div className="overflow-x-auto">
              <table className="min-w-full border border-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    {queryResult.length > 0 && Object.keys(queryResult[0]).map((column) => (
                      <th key={column} className="px-4 py-2 text-left text-sm font-medium text-gray-700 border-b">
                        {column}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {queryResult.map((row, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      {Object.values(row).map((value, cellIndex) => (
                        <td key={cellIndex} className="px-4 py-2 text-sm text-gray-900 border-b">
                          {value !== null ? String(value) : 'NULL'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Card>

      {/* Database Info */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Database Information</h3>
        <div className="space-y-2 text-sm">
          <p><strong>Host:</strong> Sevalla MySQL (Internal)</p>
          <p><strong>Database:</strong> substantial-gray-unicorn</p>
          <p><strong>Connection:</strong> Secure (SSL)</p>
          <p><strong>Access:</strong> Application Only</p>
        </div>
        
        <div className="mt-4 p-4 bg-blue-50 rounded-lg">
          <h4 className="font-medium text-blue-800 mb-2">External Database Tools</h4>
          <p className="text-sm text-blue-700 mb-3">
            To access your database with external tools like phpMyAdmin, MySQL Workbench, or TablePlus:
          </p>
          <ol className="text-sm text-blue-700 space-y-1 list-decimal list-inside">
            <li>Contact Sevalla support for database access credentials</li>
            <li>Request SSH tunnel or direct database access</li>
            <li>Use the provided connection details in your preferred tool</li>
          </ol>
        </div>
      </Card>
    </div>
  );
};

export default DatabaseManager;
