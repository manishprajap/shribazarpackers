import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useHistory } from 'react-router-dom';
import {
    IonPage,
    IonContent,
    IonToast,
    IonIcon,
    IonModal,
    IonHeader,
    IonToolbar,
    IonButton,
} from '@ionic/react';
import {
    mailOutline,
    lockClosedOutline,
    keypadOutline,
    arrowBackOutline,
    checkmarkCircle,
    eyeOutline,
    eyeOffOutline,
    alertCircleOutline,
    closeOutline,
    refreshOutline,
} from 'ionicons/icons';
import { apiPost } from '../api';
import './Login.css';

// ─────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────
const PACKER_ROLE_ID = 6;
const OTP_LENGTH = 6;
const RESEND_COOLDOWN = 60; // seconds, matches backend rate limit

// Legal docs (Terms & Privacy) API — Shreefood backend
const LEGAL_ROLE = 'packers';
const LEGAL_BASE = 'https://shriecom.in/appapis/shreefood/public/api/legal';

// ─────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────
interface PackerUser {
    id: number;
    name: string;
    email: string | null;
    phone: string;
    role_id: number;
    role: string;
    status: string;
    initials: string;
    avatar: string | null;
    zone?: string;
    vehicle?: string;
}

interface LoginStepResponse {
    phone: string;
}

interface VerifyOtpResponse {
    token: string;
    user: PackerUser;
}

interface ToastState {
    open: boolean;
    message: string;
    color: 'danger' | 'success';
}

type LegalDoc = 'terms' | 'privacy' | null;
type LegalStatus = 'idle' | 'loading' | 'loaded' | 'error';

interface LegalClause {
    title: string;
    content: string;
}

interface LegalData {
    clauses: LegalClause[];
    updated_at?: string;
}

// Simple device id helper — swap for Capacitor Device/Preferences if available
function getDeviceId(): string {
    const key = 'packer_device_id';
    let id = localStorage.getItem(key);
    if (!id) {
        id = 'dev-' + Math.random().toString(36).slice(2, 12);
        localStorage.setItem(key, id);
    }
    return id;
}

function getErrorMessage(err: unknown): string {
    return err instanceof Error ? err.message : 'Something went wrong. Please try again.';
}

// API returns: { success, message, role, clauses: [{ title, content }], updated_at }
function extractLegalClauses(json: any): { clauses: LegalClause[]; updated_at?: string } {
    const rawClauses = Array.isArray(json?.clauses) ? json.clauses : [];
    const clauses: LegalClause[] = rawClauses
        .map((c: any) => ({
            title: (c?.title ?? '').toString().trim(),
            content: (c?.content ?? '').toString().trim(),
        }))
        .filter((c: LegalClause) => c.title || c.content);

    return { clauses, updated_at: json?.updated_at };
}

function formatLegalDate(iso?: string): string {
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

const Login: React.FC = () => {
    const history = useHistory();

    const [step, setStep] = useState<'credentials' | 'otp'>('credentials');
    const [login, setLogin] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [phone, setPhone] = useState('');
    const [otp, setOtp] = useState('');
    const [loading, setLoading] = useState(false);
    const [formError, setFormError] = useState('');
    const [toast, setToast] = useState<ToastState>({ open: false, message: '', color: 'danger' });
    const [cooldown, setCooldown] = useState(0);
    const [agreedToTerms, setAgreedToTerms] = useState(false);

    // ── Legal (Terms & Privacy) modal state ──
    const [legalDoc, setLegalDoc] = useState<LegalDoc>(null);
    const [legalStatus, setLegalStatus] = useState<LegalStatus>('idle');
    const [legalData, setLegalData] = useState<LegalData | null>(null);
    const [legalError, setLegalError] = useState('');
    const legalCache = useRef<Partial<Record<'terms' | 'privacy', LegalData>>>({});
    const legalFetchInFlight = useRef<Partial<Record<'terms' | 'privacy', boolean>>>({});

    const otpInputRef = useRef<HTMLInputElement | null>(null);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        if (cooldown <= 0) return;
        timerRef.current = setInterval(() => {
            setCooldown((c) => (c > 0 ? c - 1 : 0));
        }, 1000);
        return () => {
            if (timerRef.current !== null) clearInterval(timerRef.current);
        };
    }, [cooldown]);

    useEffect(() => {
        if (step === 'otp') {
            const t = setTimeout(() => {
                otpInputRef.current?.focus();
            }, 300);
            return () => clearTimeout(t);
        }
    }, [step]);

    const showInfo = (message: string) => setToast({ open: true, message, color: 'success' });

    const handleCredentialsSubmit = useCallback(
        async (e: React.FormEvent) => {
            e.preventDefault();
            setFormError('');

            if (!agreedToTerms) {
                setFormError('Please accept the Terms & Conditions and Privacy Policy to continue.');
                return;
            }
            if (!login.trim() || !password) {
                setFormError('Enter your email/phone and password.');
                return;
            }
            setLoading(true);
            try {
                const data = await apiPost<LoginStepResponse>('/login/packer', {
                    login: login.trim(),
                    password,
                    device_id: getDeviceId(),
                });
                setPhone(data.phone);
                setStep('otp');
                setCooldown(RESEND_COOLDOWN);
                showInfo(`OTP sent to ${data.phone}`);
            } catch (err) {
                setFormError(getErrorMessage(err));
            } finally {
                setLoading(false);
            }
        },
        [login, password, agreedToTerms]
    );

    const handleOtpSubmit = useCallback(
        async (e: React.FormEvent) => {
            e.preventDefault();
            setFormError('');
            if (otp.length !== OTP_LENGTH) {
                setFormError(`Enter the ${OTP_LENGTH}-digit OTP.`);
                return;
            }
            setLoading(true);
            try {
                const data = await apiPost<VerifyOtpResponse>('/verify-otp', {
                    phone,
                    otp,
                    role_id: PACKER_ROLE_ID,
                    device_id: getDeviceId(),
                });
                localStorage.setItem('auth_token', data.token);
                localStorage.setItem('auth_user', JSON.stringify(data.user));
                showInfo('Login successful!');
                history.replace('/dashboard');
            } catch (err) {
                setFormError(getErrorMessage(err));
                setOtp('');
            } finally {
                setLoading(false);
            }
        },
        [otp, phone, history]
    );

    const handleResend = useCallback(async () => {
        if (cooldown > 0) return;
        setLoading(true);
        try {
            // ✅ FIXED: '/resendOtp' route exist hi nahi karta (routes/api.php mein
            // hyphen ke saath "resend-otp" defined hai)
            await apiPost('/resend-otp', { phone, role_id: PACKER_ROLE_ID });
            setCooldown(RESEND_COOLDOWN);
            showInfo('OTP resent.');
        } catch (err) {
            setFormError(getErrorMessage(err));
        } finally {
            setLoading(false);
        }
    }, [phone, cooldown]);

    const handleBack = () => {
        setStep('credentials');
        setOtp('');
        setFormError('');
        setCooldown(0);
        if (timerRef.current !== null) clearInterval(timerRef.current);
    };

    const handleOtpInput = (e: React.ChangeEvent<HTMLInputElement>) =>
        setOtp(e.target.value.replace(/\D/g, '').slice(0, OTP_LENGTH));

    // ── Legal doc fetch (with in-memory cache so re-opening is instant) ──
    const openLegalDoc = useCallback(async (type: 'terms' | 'privacy') => {
        setLegalDoc(type);

        const cached = legalCache.current[type];
        if (cached) {
            setLegalData(cached);
            setLegalStatus('loaded');
            return;
        }

        if (legalFetchInFlight.current[type]) return; // avoid duplicate calls
        legalFetchInFlight.current[type] = true;

        setLegalStatus('loading');
        setLegalError('');
        setLegalData(null);

        try {
            const res = await fetch(
                `${LEGAL_BASE}/${type}/${LEGAL_ROLE}?role=${LEGAL_ROLE}`,
                { method: 'GET', headers: { Accept: 'application/json' } }
            );
            if (!res.ok) throw new Error(`Server returned ${res.status}`);

            const json = await res.json();
            if (json?.success === false) throw new Error(json?.message || 'Failed to load document.');

            const { clauses, updated_at } = extractLegalClauses(json);
            if (!clauses.length) throw new Error('Document is empty. Please try again later.');

            const finalData: LegalData = { clauses, updated_at };
            legalCache.current[type] = finalData;
            setLegalData(finalData);
            setLegalStatus('loaded');
        } catch (err) {
            setLegalError(getErrorMessage(err));
            setLegalStatus('error');
        } finally {
            legalFetchInFlight.current[type] = false;
        }
    }, []);

    const closeLegalDoc = () => {
        setLegalDoc(null);
        setLegalStatus('idle');
        setLegalError('');
    };

    return (
        <IonPage>
            <IonContent fullscreen className="login-page">
                <div className="login-root">
                    <div className="login-brand">
                        <div className="login-logo">
                            <img src="/shrilogo.jpeg" alt="Shree logo" />
                        </div>
                        <p className="login-title">Shri Bazar</p>
                        <p className="login-subtitle">
                            {step === 'credentials' ? 'Sign in to your account' : `Verify the code sent to ${phone}`}
                        </p>
                    </div>

                    <div className="login-card">
                        {formError && (
                            <div className="error-banner">
                                <IonIcon icon={alertCircleOutline} />
                                <span>{formError}</span>
                            </div>
                        )}

                        {step === 'credentials' ? (
                            <form onSubmit={handleCredentialsSubmit} className="login-form">
                                <div className="step-label">Step 1 of 2 — Sign in</div>

                                <div className="form-group">
                                    <label className="form-label">Email or Phone</label>
                                    <div className="input-wrapper">
                                        <IonIcon icon={mailOutline} className="input-icon" />
                                        <input
                                            type="text"
                                            inputMode="email"
                                            placeholder="Email or phone number"
                                            value={login}
                                            onChange={(e) => setLogin(e.target.value)}
                                            disabled={loading}
                                            className="form-input"
                                        />
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Password</label>
                                    <div className="input-wrapper">
                                        <IonIcon icon={lockClosedOutline} className="input-icon" />
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            placeholder="Password"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            disabled={loading}
                                            className="form-input"
                                        />
                                        <button
                                            type="button"
                                            className="toggle-password"
                                            onClick={() => setShowPassword((s) => !s)}
                                            tabIndex={-1}
                                        >
                                            <IonIcon icon={showPassword ? eyeOffOutline : eyeOutline} />
                                        </button>
                                    </div>
                                </div>

                                {/* TERMS & PRIVACY */}
                                <label className="terms-row">
                                    <input
                                        type="checkbox"
                                        checked={agreedToTerms}
                                        onChange={(e) => setAgreedToTerms(e.target.checked)}
                                        disabled={loading}
                                        className="terms-checkbox"
                                    />
                                    <span className="terms-text">
                                        I agree to the{' '}
                                        <button
                                            type="button"
                                            className="terms-link"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                openLegalDoc('terms');
                                            }}
                                        >
                                            Terms &amp; Conditions
                                        </button>{' '}
                                        and{' '}
                                        <button
                                            type="button"
                                            className="terms-link"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                openLegalDoc('privacy');
                                            }}
                                        >
                                            Privacy Policy
                                        </button>
                                    </span>
                                </label>

                                <button
                                    type="submit"
                                    className="submit-btn"
                                    disabled={loading || !agreedToTerms}
                                >
                                    {loading ? <span className="btn-spinner" /> : 'Continue'}
                                </button>
                            </form>
                        ) : (
                            <form onSubmit={handleOtpSubmit} className="login-form">
                                <button type="button" className="back-btn" onClick={handleBack}>
                                    <IonIcon icon={arrowBackOutline} /> Back
                                </button>

                                <div className="step-label">Step 2 of 2 — Verify</div>

                                <div className="form-group">
                                    <label className="form-label">OTP Code</label>
                                    <div className="input-wrapper">
                                        <IonIcon icon={keypadOutline} className="input-icon" />
                                        <input
                                            ref={otpInputRef}
                                            type="tel"
                                            inputMode="numeric"
                                            maxLength={OTP_LENGTH}
                                            placeholder="••••••"
                                            value={otp}
                                            onChange={handleOtpInput}
                                            disabled={loading}
                                            className="form-input otp-input"
                                        />
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    className="submit-btn"
                                    disabled={loading || otp.length !== OTP_LENGTH}
                                >
                                    {loading ? (
                                        <span className="btn-spinner" />
                                    ) : (
                                        <>
                                            <IonIcon icon={checkmarkCircle} />
                                            Verify &amp; Sign in
                                        </>
                                    )}
                                </button>

                                <div className="resend-row">
                                    {cooldown > 0 ? (
                                        <span className="resend-cooldown">Resend code in {cooldown}s</span>
                                    ) : (
                                        <button type="button" className="resend-btn" onClick={handleResend}>
                                            Resend code
                                        </button>
                                    )}
                                </div>
                            </form>
                        )}
                    </div>

                    <p className="login-footnote">Warehouse &amp; packing staff only</p>
                </div>

                <IonToast
                    isOpen={toast.open}
                    message={toast.message}
                    duration={2500}
                    color={toast.color}
                    position="top"
                    onDidDismiss={() => setToast((t) => ({ ...t, open: false }))}
                />

                {/* TERMS & PRIVACY MODAL — content fetched live from API */}
                <IonModal isOpen={legalDoc !== null} onDidDismiss={closeLegalDoc} className="legal-modal">
                    <IonHeader className="ion-no-border">
                        <IonToolbar className="legal-toolbar">
                            <div className="legal-toolbar-inner">
                                <h3 className="legal-title">
                                    {legalDoc === 'terms' ? 'Terms & Conditions' : 'Privacy Policy'}
                                </h3>
                                <IonButton fill="clear" className="legal-close-btn" onClick={closeLegalDoc}>
                                    <IonIcon icon={closeOutline} />
                                </IonButton>
                            </div>
                        </IonToolbar>
                    </IonHeader>

                    <IonContent className="legal-content">
                        <div className="legal-body">
                            {legalStatus === 'loading' && (
                                <div className="legal-skeleton" aria-label="Loading document">
                                    <span className="legal-skeleton-line" style={{ width: '55%' }} />
                                    <span className="legal-skeleton-line" style={{ width: '92%' }} />
                                    <span className="legal-skeleton-line" style={{ width: '86%' }} />
                                    <span className="legal-skeleton-line" style={{ width: '70%' }} />
                                    <span className="legal-skeleton-line" style={{ width: '90%', marginTop: 16 }} />
                                    <span className="legal-skeleton-line" style={{ width: '78%' }} />
                                    <span className="legal-skeleton-line" style={{ width: '60%' }} />
                                </div>
                            )}

                            {legalStatus === 'error' && (
                                <div className="legal-error-state">
                                    <IonIcon icon={alertCircleOutline} />
                                    <p>{legalError || 'Unable to load this document right now.'}</p>
                                    <button
                                        type="button"
                                        className="legal-retry-btn"
                                        onClick={() => legalDoc && openLegalDoc(legalDoc)}
                                    >
                                        <IonIcon icon={refreshOutline} />
                                        Try again
                                    </button>
                                </div>
                            )}

                            {legalStatus === 'loaded' && legalData && (
                                <>
                                    {legalData.updated_at && (
                                        <p className="legal-updated">
                                            Last updated: {formatLegalDate(legalData.updated_at)}
                                        </p>
                                    )}

                                    <div className="legal-clauses">
                                        {legalData.clauses.map((clause, idx) => (
                                            <section className="legal-clause" key={idx}>
                                                <h4 className="legal-clause-title">
                                                    <span className="legal-clause-number">{idx + 1}</span>
                                                    {clause.title}
                                                </h4>
                                                <div className="legal-clause-content">
                                                    {clause.content
                                                        .split(/\r?\n/)
                                                        .filter((line) => line.trim().length > 0)
                                                        .map((line, i) => (
                                                            <p key={i}>{line.trim()}</p>
                                                        ))}
                                                </div>
                                            </section>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>
                    </IonContent>
                </IonModal>
            </IonContent>
        </IonPage>
    );
};

export default Login;