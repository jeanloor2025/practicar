import { useState, useEffect } from 'react';
import { Moon, Sun, BarChart3, Users, Settings, LogOut, Menu, X } from 'lucide-react';
import LeadsTable from './components/LeadsTable.jsx';
import { leadsService, authService } from './services/api.js';

function App() {
  const [darkMode, setDarkMode] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedLead, setSelectedLead] = useState(null);
  const [stats, setStats] = useState({
    total: 0,
    withoutWebsite: 0,
    highScore: 0,
    avgScore: 0,
  });

  // Toggle dark mode
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // Load leads on mount
  useEffect(() => {
    loadLeads();
  }, []);

  const loadLeads = async () => {
    try {
      setLoading(true);
      // For demo purposes, we'll use mock data if API is not available
      // In production, uncomment the API call:
      // const response = await leadsService.getLeads({ limit: 100 });
      // setLeads(response.data.leads);
      
      // Mock data for demonstration
      const mockLeads = generateMockLeads(50);
      setLeads(mockLeads);
      
      // Calculate stats
      const total = mockLeads.length;
      const withoutWebsite = mockLeads.filter(l => !l.has_website).length;
      const highScore = mockLeads.filter(l => l.lead_score >= 80).length;
      const avgScore = Math.round(mockLeads.reduce((sum, l) => sum + l.lead_score, 0) / total);
      
      setStats({ total, withoutWebsite, highScore, avgScore });
    } catch (error) {
      console.error('Error loading leads:', error);
    } finally {
      setLoading(false);
    }
  };

  // Generate mock leads for demonstration
  const generateMockLeads = (count) => {
    const niches = [
      'Restaurantes y gastronomía',
      'Talleres mecánicos y autopartes',
      'Clínicas y consultorios médicos',
      'Estudios jurídicos y notarías',
      'Gimnasios y centros deportivos',
      'Tiendas de ropa y calzado',
      'Ferreterías y materiales de construcción',
      'Peluquerías y centros de estética',
      'Inmobiliarias y constructoras',
      'Escuelas y centros educativos',
    ];

    const locations = ['Madrid', 'Barcelona', 'Valencia', 'Sevilla', 'Bilbao', 'Zaragoza'];
    const statuses = ['new', 'contacted', 'qualified', 'converted', 'rejected'];

    return Array.from({ length: count }, (_, i) => {
      const hasWebsite = Math.random() > 0.4; // 60% without website
      const niche = niches[Math.floor(Math.random() * niches.length)];
      
      // Calculate score based on criteria
      let score = 0;
      score += hasWebsite ? 0 : 40; // No website = 40 points
      score += Math.floor(Math.random() * 30); // Company size (0-30)
      score += Math.floor(Math.random() * 20); // Social media (0-20)
      score += Math.floor(Math.random() * 10); // Niche competition (0-10)
      score = Math.min(100, score);

      return {
        id: `mock-${i}`,
        name: `Negocio ${i + 1}`,
        address: `Calle Ejemplo ${i + 1}, ${locations[i % locations.length]}`,
        phone: `+34 600 ${String(i).padStart(3, '0')} ${String(i * 7).padStart(3, '0')}`,
        email: hasWebsite ? `contacto@negocio${i + 1}.com` : null,
        niche,
        location: locations[i % locations.length],
        company_size: ['small', 'medium', 'large'][Math.floor(Math.random() * 3)],
        website_url: hasWebsite ? `https://negocio${i + 1}.com` : null,
        has_website: hasWebsite,
        social_media: Math.random() > 0.5 ? { facebook: true, instagram: true } : {},
        lead_score: score,
        status: statuses[Math.floor(Math.random() * statuses.length)],
        source: 'google_maps',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-bg transition-colors duration-300">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed top-0 left-0 z-50 h-full w-64 bg-white dark:bg-dark-card border-r border-gray-200 dark:border-dark-border
        transform transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-dark-border">
          <h1 className="text-xl font-bold text-primary-600 dark:text-primary-400">
            HunterWeb
          </h1>
          <button 
            className="lg:hidden"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <nav className="p-4 space-y-2">
          <a href="#" className="flex items-center gap-3 px-4 py-3 rounded-lg bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 font-medium">
            <BarChart3 className="w-5 h-5" />
            Dashboard
          </a>
          <a href="#" className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <Users className="w-5 h-5" />
            Leads
          </a>
          <a href="#" className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <Settings className="w-5 h-5" />
            Configuración
          </a>
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 dark:border-dark-border">
          <button className="flex items-center gap-3 px-4 py-3 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors w-full">
            <LogOut className="w-5 h-5" />
            Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:ml-64">
        {/* Header */}
        <header className="sticky top-0 z-30 bg-white/80 dark:bg-dark-card/80 backdrop-blur-md border-b border-gray-200 dark:border-dark-border">
          <div className="flex items-center justify-between px-6 py-4">
            <button 
              className="lg:hidden"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="w-6 h-6" />
            </button>

            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              Dashboard de Oportunidades
            </h2>

            <div className="flex items-center gap-4">
              <button
                onClick={() => setDarkMode(!darkMode)}
                className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
              
              <div className="w-10 h-10 rounded-full bg-primary-600 flex items-center justify-center text-white font-bold">
                A
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-6">
          {/* Stats cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="card p-6 animate-slide-up">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Total Leads</p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">{stats.total}</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </div>

            <div className="card p-6 animate-slide-up" style={{ animationDelay: '0.1s' }}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Sin Sitio Web</p>
                  <p className="text-3xl font-bold text-red-600 dark:text-red-400">{stats.withoutWebsite}</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                  <X className="w-6 h-6 text-red-600 dark:text-red-400" />
                </div>
              </div>
            </div>

            <div className="card p-6 animate-slide-up" style={{ animationDelay: '0.2s' }}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Alto Score (≥80)</p>
                  <p className="text-3xl font-bold text-green-600 dark:text-green-400">{stats.highScore}</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <BarChart3 className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
              </div>
            </div>

            <div className="card p-6 animate-slide-up" style={{ animationDelay: '0.3s' }}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Score Promedio</p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">{stats.avgScore}</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                  <span className="text-xl font-bold text-purple-600 dark:text-purple-400">#</span>
                </div>
              </div>
            </div>
          </div>

          {/* Leads table */}
          <LeadsTable 
            leads={leads}
            loading={loading}
            onLeadClick={(lead) => setSelectedLead(lead)}
          />
        </main>
      </div>

      {/* Lead detail modal */}
      {selectedLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="card w-full max-w-2xl max-h-[80vh] overflow-y-auto animate-fade-in">
            <div className="p-6 border-b border-gray-200 dark:border-dark-border flex items-center justify-between sticky top-0 bg-white dark:bg-dark-card">
              <h3 className="text-xl font-bold">{selectedLead.name}</h3>
              <button
                onClick={() => setSelectedLead(null)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Nicho</p>
                  <p className="font-medium">{selectedLead.niche}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Ubicación</p>
                  <p className="font-medium">{selectedLead.location}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Teléfono</p>
                  <p className="font-medium">{selectedLead.phone || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Email</p>
                  <p className="font-medium">{selectedLead.email || 'N/A'}</p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Sitio Web</p>
                  <p className={`font-medium ${selectedLead.has_website ? 'text-green-600' : 'text-red-600'}`}>
                    {selectedLead.has_website ? 'Sí' : 'No'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Lead Score</p>
                  <p className={`text-2xl font-bold ${
                    selectedLead.lead_score >= 80 ? 'text-green-600' :
                    selectedLead.lead_score >= 60 ? 'text-yellow-600' :
                    'text-gray-600'
                  }`}>
                    {selectedLead.lead_score}/100
                  </p>
                </div>
              </div>

              {selectedLead.address && (
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Dirección</p>
                  <p className="font-medium">{selectedLead.address}</p>
                </div>
              )}

              {selectedLead.website_url && (
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">URL del sitio web</p>
                  <a 
                    href={selectedLead.website_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary-600 hover:underline"
                  >
                    {selectedLead.website_url}
                  </a>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-200 dark:border-dark-border flex justify-end gap-3 sticky bottom-0 bg-white dark:bg-dark-card">
              <button
                onClick={() => setSelectedLead(null)}
                className="btn-secondary"
              >
                Cerrar
              </button>
              <button className="btn-primary">
                Contactar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
