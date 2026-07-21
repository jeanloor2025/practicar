import { useState, useMemo } from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown, Filter, X } from 'lucide-react';
import clsx from 'clsx';

/**
 * LeadsTable Component
 * 
 * Interactive table component for displaying leads with:
 * - Sorting by any column
 * - Filtering by niche, location, status, and lead score
 * - Pagination
 * - Responsive design
 * - Dark/light theme support
 * 
 * @param {Array} leads - Array of lead objects
 * @param {Function} onLeadClick - Callback when a lead is clicked
 * @param {Boolean} loading - Loading state
 */
const LeadsTable = ({ leads = [], onLeadClick, loading = false }) => {
  // State for sorting
  const [sortConfig, setSortConfig] = useState({
    key: 'lead_score',
    direction: 'desc',
  });

  // State for filters
  const [filters, setFilters] = useState({
    niche: '',
    location: '',
    has_website: 'all', // 'all', 'true', 'false'
    status: 'all',
    min_score: 0,
  });

  // State for pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // Available options for filters
  const nicheOptions = useMemo(() => {
    const niches = [...new Set(leads.map(lead => lead.niche).filter(Boolean))];
    return niches;
  }, [leads]);

  const locationOptions = useMemo(() => {
    const locations = [...new Set(leads.map(lead => lead.location).filter(Boolean))];
    return locations;
  }, [leads]);

  const statusOptions = ['new', 'contacted', 'qualified', 'converted', 'rejected'];

  // Handle sort
  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc',
    }));
  };

  // Handle filter change
  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1); // Reset to first page when filters change
  };

  // Clear all filters
  const clearFilters = () => {
    setFilters({
      niche: '',
      location: '',
      has_website: 'all',
      status: 'all',
      min_score: 0,
    });
    setCurrentPage(1);
  };

  // Filter and sort leads
  const filteredAndSortedLeads = useMemo(() => {
    let result = [...leads];

    // Apply filters
    if (filters.niche) {
      result = result.filter(lead => 
        lead.niche?.toLowerCase().includes(filters.niche.toLowerCase())
      );
    }

    if (filters.location) {
      result = result.filter(lead => 
        lead.location?.toLowerCase().includes(filters.location.toLowerCase())
      );
    }

    if (filters.has_website !== 'all') {
      const hasWebsite = filters.has_website === 'true';
      result = result.filter(lead => lead.has_website === hasWebsite);
    }

    if (filters.status !== 'all') {
      result = result.filter(lead => lead.status === filters.status);
    }

    if (filters.min_score > 0) {
      result = result.filter(lead => lead.lead_score >= filters.min_score);
    }

    // Apply sorting
    result.sort((a, b) => {
      let aValue = a[sortConfig.key];
      let bValue = b[sortConfig.key];

      // Handle null/undefined values
      if (aValue === null || aValue === undefined) aValue = '';
      if (bValue === null || bValue === undefined) bValue = '';

      // Case-insensitive string comparison
      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (aValue < bValue) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });

    return result;
  }, [leads, filters, sortConfig]);

  // Paginate results
  const paginatedLeads = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredAndSortedLeads.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredAndSortedLeads, currentPage]);

  const totalPages = Math.ceil(filteredAndSortedLeads.length / itemsPerPage);

  // Get lead score color
  const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30';
    if (score >= 60) return 'text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/30';
    if (score >= 40) return 'text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-900/30';
    return 'text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-900/30';
  };

  // Get status badge style
  const getStatusBadge = (status) => {
    const styles = {
      new: 'badge-info',
      contacted: 'badge-warning',
      qualified: 'badge-success',
      converted: 'badge-success',
      rejected: 'badge-danger',
    };
    return styles[status] || 'badge-info';
  };

  // Sort icon component
  const SortIcon = ({ columnKey }) => {
    if (sortConfig.key !== columnKey) {
      return <ArrowUpDown className="w-4 h-4 ml-1 opacity-30" />;
    }
    return sortConfig.direction === 'asc' 
      ? <ArrowUp className="w-4 h-4 ml-1" />
      : <ArrowDown className="w-4 h-4 ml-1" />;
  };

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-500" />
            <span className="font-medium">Filtros:</span>
          </div>

          <select
            value={filters.niche}
            onChange={(e) => handleFilterChange('niche', e.target.value)}
            className="input-field w-40"
          >
            <option value="">Todos los nichos</option>
            {nicheOptions.map(niche => (
              <option key={niche} value={niche}>{niche}</option>
            ))}
          </select>

          <select
            value={filters.location}
            onChange={(e) => handleFilterChange('location', e.target.value)}
            className="input-field w-40"
          >
            <option value="">Todas las ubicaciones</option>
            {locationOptions.map(location => (
              <option key={location} value={location}>{location}</option>
            ))}
          </select>

          <select
            value={filters.has_website}
            onChange={(e) => handleFilterChange('has_website', e.target.value)}
            className="input-field w-40"
          >
            <option value="all">Todos</option>
            <option value="false">Sin sitio web</option>
            <option value="true">Con sitio web</option>
          </select>

          <select
            value={filters.status}
            onChange={(e) => handleFilterChange('status', e.target.value)}
            className="input-field w-40"
          >
            <option value="all">Todos los estados</option>
            {statusOptions.map(status => (
              <option key={status} value={status}>
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </option>
            ))}
          </select>

          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600 dark:text-gray-400">
              Score mín:
            </label>
            <input
              type="number"
              min="0"
              max="100"
              value={filters.min_score}
              onChange={(e) => handleFilterChange('min_score', parseInt(e.target.value) || 0)}
              className="input-field w-20"
            />
          </div>

          {(Object.values(filters).some(v => v !== '' && v !== 'all' && v !== 0)) && (
            <button
              onClick={clearFilters}
              className="btn-secondary flex items-center gap-1"
            >
              <X className="w-4 h-4" />
              Limpiar
            </button>
          )}
        </div>

        {/* Active filters summary */}
        <div className="mt-3 flex flex-wrap gap-2">
          {filters.niche && (
            <span className="badge badge-info">
              Nicho: {filters.niche}
              <button
                onClick={() => handleFilterChange('niche', '')}
                className="ml-1 hover:text-red-500"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {filters.location && (
            <span className="badge badge-info">
              Ubicación: {filters.location}
              <button
                onClick={() => handleFilterChange('location', '')}
                className="ml-1 hover:text-red-500"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {filters.has_website !== 'all' && (
            <span className="badge badge-info">
              Web: {filters.has_website === 'true' ? 'Sí' : 'No'}
              <button
                onClick={() => handleFilterChange('has_website', 'all')}
                className="ml-1 hover:text-red-500"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {filters.min_score > 0 && (
            <span className="badge badge-info">
              Score ≥ {filters.min_score}
              <button
                onClick={() => handleFilterChange('min_score', 0)}
                className="ml-1 hover:text-red-500"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-dark-card border-b border-gray-200 dark:border-dark-border">
              <tr>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  onClick={() => handleSort('name')}
                >
                  <div className="flex items-center">
                    Nombre
                    <SortIcon columnKey="name" />
                  </div>
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  onClick={() => handleSort('niche')}
                >
                  <div className="flex items-center">
                    Nicho
                    <SortIcon columnKey="niche" />
                  </div>
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  onClick={() => handleSort('location')}
                >
                  <div className="flex items-center">
                    Ubicación
                    <SortIcon columnKey="location" />
                  </div>
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  onClick={() => handleSort('has_website')}
                >
                  <div className="flex items-center">
                    Sitio Web
                    <SortIcon columnKey="has_website" />
                  </div>
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  onClick={() => handleSort('lead_score')}
                >
                  <div className="flex items-center">
                    Lead Score
                    <SortIcon columnKey="lead_score" />
                  </div>
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  onClick={() => handleSort('status')}
                >
                  <div className="flex items-center">
                    Estado
                    <SortIcon columnKey="status" />
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-dark-border">
              {loading ? (
                <tr>
                  <td colSpan="7" className="px-6 py-8 text-center">
                    <div className="animate-pulse text-gray-500">Cargando...</div>
                  </td>
                </tr>
              ) : paginatedLeads.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                    No se encontraron leads con los filtros actuales
                  </td>
                </tr>
              ) : (
                paginatedLeads.map((lead) => (
                  <tr
                    key={lead.id}
                    onClick={() => onLeadClick?.(lead)}
                    className="hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {lead.name}
                      </div>
                      {lead.phone && (
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {lead.phone}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-gray-100">{lead.niche}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-gray-100">{lead.location}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {lead.has_website ? (
                        <span className="badge badge-success">Sí</span>
                      ) : (
                        <span className="badge badge-danger">No</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={clsx('badge px-3 py-1 text-sm font-bold', getScoreColor(lead.lead_score))}>
                        {lead.lead_score}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={clsx('badge', getStatusBadge(lead.status))}>
                        {lead.status?.charAt(0).toUpperCase() + lead.status?.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onLeadClick?.(lead);
                        }}
                        className="text-primary-600 hover:text-primary-800 dark:text-primary-400 dark:hover:text-primary-300 font-medium"
                      >
                        Ver
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200 dark:border-dark-border flex items-center justify-between">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Mostrando {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, filteredAndSortedLeads.length)} de {filteredAndSortedLeads.length} leads
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Anterior
              </button>
              <span className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400">
                Página {currentPage} de {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Results summary */}
      <div className="text-sm text-gray-600 dark:text-gray-400">
        {filteredAndSortedLeads.length} leads encontrados
        {leads.length !== filteredAndSortedLeads.length && (
          <span> (de {leads.length} totales)</span>
        )}
      </div>
    </div>
  );
};

export default LeadsTable;
