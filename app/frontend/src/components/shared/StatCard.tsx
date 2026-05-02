import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  trend?: string;
  gradient?: string;
}

export default function StatCard({ label, value, icon: Icon, trend, gradient = 'from-indigo-500 to-violet-500' }: StatCardProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</div>
          <div className="mt-2 text-3xl font-bold text-slate-900 dark:text-slate-100">{value}</div>
          {trend && (
            <div className="mt-2 text-xs font-medium text-emerald-600 dark:text-emerald-400">
              {trend}
            </div>
          )}
        </div>
        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-lg`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
      <div className={`absolute -right-8 -bottom-8 w-32 h-32 rounded-full bg-gradient-to-br ${gradient} opacity-5 blur-2xl`} />
    </div>
  );
}