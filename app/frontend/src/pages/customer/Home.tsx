import { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, Clock, Star, ArrowRight, Calendar, Sparkles, Zap, Shield, AlertCircle } from 'lucide-react';
import Navbar from '@/components/shared/Navbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { serviceAPI } from '@/lib/api';

const categories = ['All', 'Beauty', 'Healthcare', 'Coaching', 'Wellness', 'Finance'];

interface Service {
  _id: string;
  name: string;
  duration: number;
  price: number;
  organiser: { name: string };
  category: string;
  description: string;
}

export default function Home() {
  const [query, setQuery] = useState('');
  const [activeCat, setActiveCat] = useState('All');
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    try {
      setLoading(true);
      const response = await serviceAPI.getAllServices({ category: activeCat !== 'All' ? activeCat : undefined });
      setServices(response.data.data);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load services');
      toast.error('Failed to load services');
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    return services.filter((s) => {
      const matchQ = s.name.toLowerCase().includes(query.toLowerCase()) || s.organiser.name.toLowerCase().includes(query.toLowerCase());
      const matchC = activeCat === 'All' || s.category === activeCat;
      return matchQ && matchC;
    });
  }, [query, activeCat, services]);

  const catGradients: Record<string, string> = {
    Beauty: 'from-pink-400 to-rose-500',
    Healthcare: 'from-teal-400 to-cyan-500',
    Coaching: 'from-indigo-500 to-violet-500',
    Wellness: 'from-emerald-400 to-green-500',
    Finance: 'from-amber-400 to-orange-500',
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-slate-900">
      <Navbar />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 via-white to-violet-50 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950" />
        <div className="absolute top-20 left-10 w-72 h-72 bg-indigo-300 dark:bg-indigo-600 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-3xl opacity-20 animate-pulse" />
        <div className="absolute bottom-10 right-10 w-72 h-72 bg-violet-300 dark:bg-violet-600 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-3xl opacity-20 animate-pulse" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-20 text-center">
          <Badge variant="outline" className="mb-6 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm border-indigo-200 dark:border-indigo-800">
            <Sparkles className="w-3 h-3 mr-1 text-indigo-500" />
            Trusted by 10,000+ professionals
          </Badge>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Book appointments,
            <br />
            <span className="bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 bg-clip-text text-transparent">
              effortlessly.
            </span>
          </h1>
          <p className="mt-6 text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
            Discover top-rated services and schedule with real-time availability.
            Smart, simple, and delightfully smooth.
          </p>

          <div className="mt-10 max-w-2xl mx-auto">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search services or providers..."
                className="h-14 pl-12 pr-32 rounded-2xl text-base shadow-xl border-white/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl"
              />
              <Link to="/book" className="absolute right-2 top-1/2 -translate-y-1/2">
                <Button className="h-10 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white">
                  Book Now
                </Button>
              </Link>
            </div>
          </div>

          <div className="mt-10 grid grid-cols-3 gap-4 max-w-2xl mx-auto">
            {[
              { icon: Zap, label: 'Instant booking', gradient: 'from-amber-400 to-orange-500' },
              { icon: Shield, label: 'Secure payments', gradient: 'from-emerald-400 to-teal-500' },
              { icon: Calendar, label: 'Real-time slots', gradient: 'from-indigo-500 to-violet-500' },
            ].map((f) => (
              <div key={f.label} className="flex flex-col items-center gap-2">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${f.gradient} flex items-center justify-center shadow-md`}>
                  <f.icon className="w-5 h-5 text-white" />
                </div>
                <span className="text-xs font-medium text-slate-600 dark:text-slate-400">{f.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Services */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Popular services</h2>
            <p className="text-slate-500 dark:text-slate-400 mt-1">Find the perfect service for you</p>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => {
                  setActiveCat(cat);
                }}
                className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                  activeCat === cat
                    ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:border-indigo-300'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
            <div>
              <p className="text-sm font-medium text-red-900 dark:text-red-200">{error}</p>
              <button onClick={fetchServices} className="text-xs text-red-700 dark:text-red-300 hover:underline mt-1">
                Try again
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="space-y-8 w-full">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse bg-slate-200 dark:bg-slate-800 h-48 rounded-2xl" />
              ))}
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <Calendar className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-4" />
            <p className="text-slate-500 dark:text-slate-400">No services match your search</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((s, idx) => (
              <div
                key={s._id}
                className="group relative rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 animate-in fade-in slide-in-from-bottom-4"
                style={{ animationDelay: `${idx * 50}ms` }}
              >
                <div className={`h-32 bg-gradient-to-br from-indigo-500 to-violet-500 relative overflow-hidden`}>
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_white_0%,_transparent_60%)] opacity-20" />
                  <div className="absolute top-4 left-4">
                    <Badge className="bg-white/20 backdrop-blur-md text-white border-white/30 hover:bg-white/30">
                      {s.category}
                    </Badge>
                  </div>
                  <div className="absolute bottom-4 right-4 text-white">
                    <div className="text-2xl font-bold">${s.price}</div>
                  </div>
                </div>
                <div className="p-5">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{s.name}</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">{s.description}</p>

                  <div className="mt-4 flex items-center gap-4 text-sm text-slate-600 dark:text-slate-400">
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {s.duration} min
                    </div>
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                      4.9
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <div className={`w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-white text-xs font-semibold`}>
                        {s.organiser.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                      </div>
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{s.organiser.name}</span>
                    </div>
                    <Link to={`/book?service=${s._id}`}>
                      <Button size="sm" className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white">
                        Book Now <ArrowRight className="w-3 h-3 ml-1" />
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <footer className="border-t border-slate-200 dark:border-slate-800 py-8 text-center text-sm text-slate-500">
        © 2026 Booksy. Crafted with care for better scheduling.
      </footer>
    </div>
  );
}