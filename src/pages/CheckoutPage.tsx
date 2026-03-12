import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../AuthContext';
import { Loader2, Tag, Check } from 'lucide-react';
import PublicLayout from '../components/PublicLayout';

type Plan = { id: string; name: string; price: number; minutes_limit: number };

export default function CheckoutPage() {
  const { t } = useTranslation();
  const { user, updateUser } = useAuth();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    const plan = new URLSearchParams(window.location.search).get('plan');
    return plan || null;
  });
  const [promoCode, setPromoCode] = useState('');
  const [promoValid, setPromoValid] = useState<{ discountPercent?: number; planId?: string; planMonths?: number } | null>(null);
  const [promoLoading, setPromoLoading] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleNav = (path: string) => () => {
    window.history.pushState({}, '', path);
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/public/plans', { signal: controller.signal })
      .then((r) => r.json())
      .then((data) => {
        const list = Array.isArray(data) ? data : [];
        setPlans(list);
        const plan = new URLSearchParams(window.location.search).get('plan');
        if (plan && list.some((p: Plan) => p.id === plan)) {
          setSelectedPlanId(plan);
        }
      })
      .catch((err) => { if (err.name !== 'AbortError') setPlans([]); })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, []);

  const validatePromo = async () => {
    if (!promoCode.trim() || !selectedPlanId) return;
    setPromoLoading(true);
    setPromoValid(null);
    setError('');
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      const token = localStorage.getItem('token');
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const res = await fetch('/api/public/validate-promo', {
        method: 'POST',
        headers,
        body: JSON.stringify({ code: promoCode.trim(), planId: selectedPlanId }),
      });
      const data = await res.json();
      if (res.ok && data.valid) {
        setPromoValid({
          discountPercent: data.discountPercent,
          planId: data.planId,
          planMonths: data.planMonths,
        });
      } else {
        setPromoValid(null);
        setError(data.error || t('checkout.invalidPromo'));
      }
    } catch {
      setError(t('checkout.invalidPromo'));
    } finally {
      setPromoLoading(false);
    }
  };

  const handleCheckout = async () => {
    if (!selectedPlanId || !user) return;
    setCheckoutLoading(true);
    setError('');
    try {
      const res = await fetch('/api/user/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          planId: selectedPlanId,
          promoCode: promoCode.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Checkout failed');
      if (user && data.planId) {
        updateUser({ ...user, plan_id: data.planId });
      }
      setSuccess(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCheckoutLoading(false);
    }
  };

  const selectedPlan = plans.find((p) => p.id === selectedPlanId);
  const isPaidPlan = selectedPlan ? (selectedPlan.price ?? 0) > 0 : false;
  const canComplete = !isPaidPlan || (isPaidPlan && promoValid !== null);
  const displayPrice = selectedPlan
    ? promoValid?.discountPercent
      ? Math.round((selectedPlan.price * (100 - promoValid.discountPercent)) / 100)
      : selectedPlan.price
    : 0;

  const returnTo = typeof window !== 'undefined' ? encodeURIComponent(window.location.pathname + window.location.search) : '/checkout';

  if (!user) {
    return (
      <PublicLayout>
        <div className="max-w-md mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold text-slate-900 mb-4 font-heading">{t('checkout.signInRequired')}</h1>
          <p className="text-slate-600 mb-8 font-body">{t('checkout.signInRequiredDesc')}</p>
          <div className="flex gap-4 justify-center">
            <a href={`/login?returnTo=${returnTo}`} onClick={(e) => { e.preventDefault(); handleNav(`/login?returnTo=${returnTo}`)(); }} className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700">
              {t('auth.signIn')}
            </a>
            <a href={`/signup?returnTo=${returnTo}`} onClick={(e) => { e.preventDefault(); handleNav(`/signup?returnTo=${returnTo}`)(); }} className="px-6 py-3 bg-slate-200 text-slate-800 rounded-xl font-semibold hover:bg-slate-300">
              {t('auth.signUp')}
            </a>
          </div>
        </div>
      </PublicLayout>
    );
  }

  if (success) {
    return (
      <PublicLayout>
        <div className="max-w-md mx-auto px-4 py-16 text-center">
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-8">
            <Check className="w-16 h-16 text-emerald-600 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-slate-900 mb-2 font-heading">{t('checkout.success')}</h1>
            <p className="text-slate-600 mb-6 font-body">{t('checkout.successDesc')}</p>
            <a href="/dashboard" onClick={(e) => { e.preventDefault(); handleNav('/dashboard')(); }} className="inline-block px-6 py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700">
              {t('checkout.goToDashboard')}
            </a>
          </div>
        </div>
      </PublicLayout>
    );
  }

  return (
    <PublicLayout>
      <div className="max-w-2xl mx-auto px-4 py-16">
        <h1 className="text-3xl font-bold text-slate-900 mb-2 font-heading">{t('checkout.title')}</h1>
        <p className="text-slate-600 mb-8 font-body">{t('checkout.subtitle')}</p>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
          </div>
        ) : (
          <div className="space-y-6">
            {error && (
              <div className="p-4 bg-red-50 text-red-600 rounded-xl border border-red-100 text-sm">{error}</div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">{t('checkout.selectPlan')}</label>
              <div className="grid gap-4">
                {plans.map((plan) => (
                  <button
                    key={plan.id}
                    type="button"
                    onClick={() => {
                      setSelectedPlanId(plan.id);
                      setPromoValid(null);
                    }}
                    className={`block w-full text-left p-4 rounded-xl border-2 transition-colors ${
                      selectedPlanId === plan.id ? 'border-indigo-600 bg-indigo-50' : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-slate-900">{plan.name}</span>
                      <span className="text-slate-600">
                        ${plan.price} <span className="text-sm">{t('landing.pricing.perMonth')}</span>
                      </span>
                    </div>
                    <p className="text-sm text-slate-500 mt-1">{t('landing.pricing.monthlyMinutes', { count: plan.minutes_limit })}</p>
                  </button>
                ))}
              </div>
            </div>

            {selectedPlanId && (
              <>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">{t('checkout.promoCode')}</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={promoCode}
                      onChange={(e) => {
                        setPromoCode(e.target.value);
                        setPromoValid(null);
                      }}
                      placeholder={t('checkout.promoPlaceholder')}
                      className="flex-1 px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                    />
                    <button
                      type="button"
                      onClick={validatePromo}
                      disabled={promoLoading || !promoCode.trim()}
                      className="px-4 py-2.5 bg-slate-200 text-slate-800 rounded-xl font-medium hover:bg-slate-300 disabled:opacity-50 flex items-center gap-2"
                    >
                      {promoLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Tag className="w-4 h-4" />}
                      {t('checkout.apply')}
                    </button>
                  </div>
                  {promoValid && (
                    <p className="mt-2 text-sm text-emerald-600">
                      {promoValid.discountPercent
                        ? t('checkout.discountApplied', { percent: promoValid.discountPercent })
                        : promoValid.planMonths
                        ? t('checkout.planForTime', { months: promoValid.planMonths })
                        : t('checkout.promoApplied')}
                    </p>
                  )}
                  {isPaidPlan && !promoValid && (
                    <p className="mt-2 text-sm text-amber-600">{t('checkout.promoRequired')}</p>
                  )}
                </div>

                <div className="border-t border-slate-200 pt-6">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-slate-600">{t('checkout.total')}</span>
                    <span className="text-2xl font-bold text-slate-900">
                      ${displayPrice} <span className="text-sm font-normal text-slate-500">{t('landing.pricing.perMonth')}</span>
                    </span>
                  </div>
                  <button
                    onClick={handleCheckout}
                    disabled={checkoutLoading || !canComplete}
                    className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-semibold transition-colors disabled:opacity-70"
                  >
                    {checkoutLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
                    {t('checkout.complete')}
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </PublicLayout>
  );
}
