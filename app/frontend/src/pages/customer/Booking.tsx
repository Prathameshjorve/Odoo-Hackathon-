import { useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Check, ChevronLeft, ChevronRight, Calendar as CalIcon, Clock, CreditCard, Users, FileText, Sparkles } from 'lucide-react';
import Navbar from '@/components/shared/Navbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { services, providers, timeSlots, unavailableSlots } from '@/lib/mockData';
import { toast } from 'sonner';

const steps = [
  { id: 1, label: 'Service', icon: Sparkles },
  { id: 2, label: 'Provider', icon: Users },
  { id: 3, label: 'Date', icon: CalIcon },
  { id: 4, label: 'Time', icon: Clock },
  { id: 5, label: 'Capacity', icon: Users },
  { id: 6, label: 'Details', icon: FileText },
  { id: 7, label: 'Payment', icon: CreditCard },
  { id: 8, label: 'Confirm', icon: Check },
];

function generateCalendar(date: Date) {
  const year = date.getFullYear();
  const month = date.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startOffset = firstDay.getDay();
  const days: (Date | null)[] = [];
  for (let i = 0; i < startOffset; i++) days.push(null);
  for (let d = 1; d <= lastDay.getDate(); d++) days.push(new Date(year, month, d));
  return days;
}

export default function Booking() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const preselectedService = params.get('service');

  const [step, setStep] = useState(1);
  const [selectedService, setSelectedService] = useState<string | null>(preselectedService);
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [capacity, setCapacity] = useState(1);
  const [formData, setFormData] = useState({ name: '', phone: '', notes: '' });
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [calendarMonth, setCalendarMonth] = useState(new Date(2026, 4, 1));

  const service = services.find((s) => s.id === selectedService);
  const provider = providers.find((p) => p.id === selectedProvider);
  const availableProviders = useMemo(
    () => providers.filter((p) => !selectedService || p.services.includes(selectedService) || true),
    [selectedService]
  );

  const calendar = generateCalendar(calendarMonth);
  const monthName = calendarMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const canNext = () => {
    if (step === 1) return !!selectedService;
    if (step === 2) return !!selectedProvider;
    if (step === 3) return !!selectedDate;
    if (step === 4) return !!selectedTime;
    if (step === 6) return !!formData.name && !!formData.phone;
    return true;
  };

  const handleNext = () => {
    if (!canNext()) {
      toast.error('Please complete this step');
      return;
    }
    if (step < 8) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleFinish = () => {
    toast.success('Appointment booked successfully!');
    navigate('/confirmation', {
      state: {
        service: service?.name,
        provider: provider?.name,
        date: selectedDate?.toDateString(),
        time: selectedTime,
        price: service?.price,
        capacity,
      },
    });
  };

  const isDateDisabled = (d: Date | null) => {
    if (!d) return true;
    const today = new Date(2026, 4, 1);
    today.setHours(0, 0, 0, 0);
    return d < today;
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <Navbar />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Stepper */}
        <div className="mb-10">
          <div className="flex items-center justify-between overflow-x-auto pb-2">
            {steps.map((s, i) => {
              const Icon = s.icon;
              const done = step > s.id;
              const active = step === s.id;
              return (
                <div key={s.id} className="flex items-center flex-1 min-w-0">
                  <div className="flex flex-col items-center flex-shrink-0">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm transition-all ${
                        done
                          ? 'bg-emerald-500 text-white shadow-lg'
                          : active
                          ? 'bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-lg scale-110'
                          : 'bg-white dark:bg-slate-800 text-slate-400 border border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      {done ? <Check className="w-5 h-5" /> : <Icon className="w-4 h-4" />}
                    </div>
                    <div className={`text-xs font-medium mt-2 hidden sm:block ${active || done ? 'text-slate-900 dark:text-slate-100' : 'text-slate-400'}`}>
                      {s.label}
                    </div>
                  </div>
                  {i < steps.length - 1 && (
                    <div className={`flex-1 h-0.5 mx-2 transition-colors ${done ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-700'}`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Step content */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 sm:p-8 min-h-[400px]">
          {step === 1 && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-300">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Select a service</h2>
              <p className="text-sm text-slate-500 mt-1">Pick what you'd like to book today</p>
              <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
                {services.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setSelectedService(s.id)}
                    className={`text-left p-4 rounded-xl border-2 transition-all ${
                      selectedService === s.id
                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10 shadow-md'
                        : 'border-slate-200 dark:border-slate-800 hover:border-indigo-300'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-semibold text-slate-900 dark:text-slate-100">{s.name}</div>
                        <div className="text-xs text-slate-500 mt-1">{s.category} · {s.duration} min</div>
                      </div>
                      <div className="font-bold text-indigo-600">${s.price}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-300">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Choose a provider</h2>
              <p className="text-sm text-slate-500 mt-1">Select who you'd like to see</p>
              <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
                {availableProviders.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setSelectedProvider(p.id)}
                    className={`text-left p-4 rounded-xl border-2 transition-all flex items-center gap-3 ${
                      selectedProvider === p.id
                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10 shadow-md'
                        : 'border-slate-200 dark:border-slate-800 hover:border-indigo-300'
                    }`}
                  >
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-white font-semibold">
                      {p.avatar}
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-slate-900 dark:text-slate-100">{p.name}</div>
                      <div className="text-xs text-slate-500">{p.role} · ★ {p.rating}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-300">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Pick a date</h2>
              <p className="text-sm text-slate-500 mt-1">Select your preferred day</p>

              <div className="mt-6 max-w-md mx-auto">
                <div className="flex items-center justify-between mb-4">
                  <button
                    onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1))}
                    className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <div className="font-semibold text-slate-900 dark:text-slate-100">{monthName}</div>
                  <button
                    onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1))}
                    className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-7 gap-1 text-center text-xs text-slate-500 mb-2">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                    <div key={d} className="py-1 font-medium">{d}</div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {calendar.map((d, i) => {
                    const disabled = isDateDisabled(d);
                    const isSelected = d && selectedDate && d.toDateString() === selectedDate.toDateString();
                    return (
                      <button
                        key={i}
                        disabled={disabled}
                        onClick={() => d && setSelectedDate(d)}
                        className={`aspect-square rounded-lg text-sm font-medium transition-all ${
                          !d
                            ? 'invisible'
                            : isSelected
                            ? 'bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-md scale-105'
                            : disabled
                            ? 'text-slate-300 dark:text-slate-700 cursor-not-allowed'
                            : 'text-slate-700 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-indigo-500/10'
                        }`}
                      >
                        {d?.getDate()}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-300">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Choose a time slot</h2>
              <p className="text-sm text-slate-500 mt-1">
                {selectedDate?.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              </p>
              <div className="mt-6 grid grid-cols-3 sm:grid-cols-4 gap-2">
                {timeSlots.map((t) => {
                  const unavailable = unavailableSlots.includes(t);
                  const selected = selectedTime === t;
                  return (
                    <button
                      key={t}
                      disabled={unavailable}
                      onClick={() => setSelectedTime(t)}
                      className={`py-3 rounded-xl font-medium text-sm transition-all ${
                        selected
                          ? 'bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-md scale-105'
                          : unavailable
                          ? 'bg-slate-100 dark:bg-slate-800 text-slate-300 dark:text-slate-600 line-through cursor-not-allowed'
                          : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-indigo-400 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {t}
                    </button>
                  );
                })}
              </div>
              <div className="mt-4 flex gap-4 text-xs text-slate-500">
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-white border border-slate-300" /> Available</div>
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-slate-200" /> Booked</div>
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-gradient-to-br from-indigo-600 to-violet-600" /> Selected</div>
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-300">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Number of guests</h2>
              <p className="text-sm text-slate-500 mt-1">How many people are attending?</p>
              <div className="mt-8 flex items-center justify-center gap-4">
                <button
                  onClick={() => setCapacity(Math.max(1, capacity - 1))}
                  className="w-12 h-12 rounded-full border-2 border-slate-200 dark:border-slate-700 text-2xl font-bold hover:border-indigo-400 transition-colors"
                >
                  −
                </button>
                <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white flex items-center justify-center text-4xl font-bold shadow-lg">
                  {capacity}
                </div>
                <button
                  onClick={() => setCapacity(Math.min(10, capacity + 1))}
                  className="w-12 h-12 rounded-full border-2 border-slate-200 dark:border-slate-700 text-2xl font-bold hover:border-indigo-400 transition-colors"
                >
                  +
                </button>
              </div>
              <p className="mt-6 text-center text-sm text-slate-500">Max 10 guests per booking</p>
            </div>
          )}

          {step === 6 && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-300">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Your details</h2>
              <p className="text-sm text-slate-500 mt-1">Tell us a bit about yourself</p>
              <div className="mt-6 space-y-4 max-w-lg">
                <div className="space-y-2">
                  <Label>Full name</Label>
                  <Input
                    placeholder="Jane Doe"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Phone number</Label>
                  <Input
                    placeholder="+1 (555) 000-0000"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Additional notes (optional)</Label>
                  <Textarea
                    placeholder="Anything we should know?"
                    rows={4}
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  />
                </div>
              </div>
            </div>
          )}

          {step === 7 && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-300">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Payment</h2>
              <p className="text-sm text-slate-500 mt-1">Secure your booking</p>

              <div className="mt-6 max-w-lg space-y-4">
                <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod} className="gap-3">
                  {[
                    { v: 'card', label: 'Credit / Debit card', sub: 'Visa, Mastercard, Amex' },
                    { v: 'paypal', label: 'PayPal', sub: 'Pay with your PayPal account' },
                    { v: 'venue', label: 'Pay at venue', sub: 'Pay when you arrive' },
                  ].map((opt) => (
                    <div key={opt.v} className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${paymentMethod === opt.v ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10' : 'border-slate-200 dark:border-slate-800'}`}>
                      <RadioGroupItem value={opt.v} id={opt.v} />
                      <Label htmlFor={opt.v} className="flex-1 cursor-pointer">
                        <div className="font-medium">{opt.label}</div>
                        <div className="text-xs text-slate-500">{opt.sub}</div>
                      </Label>
                    </div>
                  ))}
                </RadioGroup>

                <div className="rounded-xl bg-slate-50 dark:bg-slate-800/50 p-4 text-sm">
                  <div className="flex justify-between"><span className="text-slate-500">Service</span><span>{service?.name}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Guests</span><span>× {capacity}</span></div>
                  <div className="flex justify-between mt-2 pt-2 border-t border-slate-200 dark:border-slate-700 font-semibold"><span>Total</span><span>${(service?.price || 0) * capacity}</span></div>
                </div>
              </div>
            </div>
          )}

          {step === 8 && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-300">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Review & confirm</h2>
              <p className="text-sm text-slate-500 mt-1">Make sure everything looks right</p>
              <div className="mt-6 rounded-2xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-200 dark:divide-slate-800">
                {[
                  { label: 'Service', value: service?.name },
                  { label: 'Provider', value: provider?.name },
                  { label: 'Date', value: selectedDate?.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) },
                  { label: 'Time', value: selectedTime },
                  { label: 'Guests', value: capacity },
                  { label: 'Name', value: formData.name },
                  { label: 'Phone', value: formData.phone },
                  { label: 'Payment', value: paymentMethod },
                  { label: 'Total', value: `$${(service?.price || 0) * capacity}` },
                ].map((r) => (
                  <div key={r.label} className="flex justify-between items-center px-4 py-3">
                    <span className="text-sm text-slate-500">{r.label}</span>
                    <span className="text-sm font-medium text-slate-900 dark:text-slate-100">{r.value}</span>
                  </div>
                ))}
              </div>
              <Badge className="mt-4 bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400">
                <Check className="w-3 h-3 mr-1" /> No double-booking detected
              </Badge>
            </div>
          )}
        </div>

        {/* Nav buttons */}
        <div className="mt-6 flex justify-between">
          <Button variant="outline" onClick={handleBack} disabled={step === 1}>
            <ChevronLeft className="w-4 h-4 mr-1" /> Back
          </Button>
          {step < 8 ? (
            <Button onClick={handleNext} className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white">
              Next <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button onClick={handleFinish} className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white">
              <Check className="w-4 h-4 mr-1" /> Confirm booking
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}