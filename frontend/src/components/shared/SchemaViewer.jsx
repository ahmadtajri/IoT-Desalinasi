// Schema Viewer Component - Display active desalination schema
import { useState, useEffect } from 'react';
import schemaService from '../../services/schemaService';
import { Loader2, AlertCircle } from 'lucide-react';

const SchemaViewer = () => {
    const [schema, setSchema] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchActiveSchema();
    }, []);

    const fetchActiveSchema = async () => {
        try {
            setLoading(true);
            setError('');
            const response = await schemaService.getActiveSchema();

            if (response.success) {
                setSchema(response.data);
            } else {
                setError('No active schema found');
            }
        } catch (err) {
            console.error('Error fetching schema:', err);
            setError('Failed to load schema');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-gray-100">
                <div className="flex items-center justify-center">
                    <Loader2 className="w-6 h-6 sm:w-8 sm:h-8 text-blue-500 animate-spin" />
                    <span className="ml-2 sm:ml-3 text-sm sm:text-base text-gray-600">Loading schema...</span>
                </div>
            </div>
        );
    }

    if (error || !schema) {
        return (
            <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-gray-100">
                <div className="flex flex-col items-center justify-center text-center">
                    <AlertCircle className="w-10 h-10 sm:w-12 sm:h-12 text-gray-400 mb-2 sm:mb-3" />
                    <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-1 sm:mb-2">No Schema Available</h3>
                    <p className="text-gray-500 text-xs sm:text-sm px-4">
                        {error || 'No desalination schema has been uploaded yet.'}
                    </p>
                    <p className="text-gray-400 text-xs mt-1 sm:mt-2">
                        Contact your administrator to upload a schema.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white h-full flex flex-col overflow-hidden">

            {/* SVG Viewer */}
            <div className="p-3 sm:p-4 bg-gray-50 flex-1 overflow-auto">
                <div className="w-full min-h-full flex items-center justify-center">
                    <div
                        className="bg-white p-3 sm:p-4 rounded-xl shadow-sm border border-gray-200 inline-flex items-center justify-center"
                    >
                        <div
                            className="[&>svg]:max-w-full [&>svg]:max-h-[75vh] [&>svg]:w-auto [&>svg]:h-auto"
                            dangerouslySetInnerHTML={{ __html: schema.svgContent }}
                        />
                    </div>
                </div>
            </div>

            {/* Footer Info */}
            <div className="p-2 sm:p-3 bg-gray-50 border-t border-gray-100">
                <div className="flex flex-col xs:flex-row items-start xs:items-center justify-between gap-1 xs:gap-2 text-[10px] xs:text-xs text-gray-500">
                    <span className="truncate">Last updated: {new Date(schema.updatedAt).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })}</span>
                    <span className="truncate">Created: {new Date(schema.createdAt).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })}</span>
                </div>
            </div>
        </div>
    );
};

export default SchemaViewer;
