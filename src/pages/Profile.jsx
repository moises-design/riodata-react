import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { sb } from '../lib/supabase'
import { upsertProfile, ROLES } from '../lib/db'
import AuthModal from '../components/AuthModal'

const SECTORS = ['Construction', 'Energy', 'Manufacturing', 'Logistics', 'Technology', 'Healthcare', 'Government', 'Agriculture', 'Other']
const COMPLETION_FIELDS = ['full_name', 'phone', 'role', 'sector', 'city', 'bio']

export default function Profile() {
  const [user,         setUser]         = useState(null)
  const [loading,      setLoading]      = useState(true)
  const [saving,       setSaving]       = useState(false)
  const [saved,        setSaved]        = useState(false)
  const [error,        setError]        = useState('')
  const [authModal,    setAuthModal]    = useState(null)
  const [avatarUrl,    setAvatarUrl]    = useState(null)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const fileInputRef = useRef(null)
  const [form, setForm] = useState({
    full_name:     '',
    phone:         '',
    role:          '',
    title:         '',
    sector:        '',
    city:          '',
    bio:           '',
    email_digest:  false,
  })

  useEffect(() => {
    sb.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) { setUser(session.user); loadProfile(session.user.id) }
      else setLoading(false)
    })
    const { data: { subscription } } = sb.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN')  { setUser(session.user); loadProfile(session.user.id) }
      if (event === 'SIGNED_OUT') { setUser(null); setLoading(false) }
    })
    return () => subscription.unsubscribe()
  }, [])

  async function loadProfile(userId) {
    const { data } = await sb.from('profiles').select('*').eq('id', userId).single()
    if (data) {
      setForm({
        full_name:    data.full_name    || '',
        phone:        data.phone        || '',
        role:         data.role         || '',
        title:        data.title        || '',
        sector:       data.sector       || '',
        city:         data.city         || '',
        bio:          data.bio          || '',
        email_digest: data.email_digest || false,
      })
      if (data.avatar_url) setAvatarUrl(data.avatar_url)
    }
    setLoading(false)
  }

  async function handleAvatarChange(e) {
    const file = e.target.files?.[0]
    if (!file || !user) return
    if (file.size > 5 * 1024 * 1024) { setError('Photo must be under 5MB.'); return }

    setAvatarUploading(true)
    setError('')
    const ext  = file.name.split('.').pop()
    const path = `${user.id}/avatar.${ext}`

    const { error: upErr } = await sb.storage.from('avatars').upload(path, file, { upsert: true })
    if (upErr) { setError('Upload failed: ' + upErr.message); setAvatarUploading(false); return }

    const { data: { publicUrl } } = sb.storage.from('avatars').getPublicUrl(path)
    setAvatarUrl(publicUrl)

    // Persist to profile immediately
    await upsertProfile(user.id, { avatar_url: publicUrl }).catch(() => {})
    setAvatarUploading(false)
  }

  const filledCount     = COMPLETION_FIELDS.filter(f => form[f] && String(form[f]).trim()).length
  const completionPct   = Math.round((filledCount / COMPLETION_FIELDS.length) * 100)
  const completionColor = completionPct >= 80 ? '#2A6B43' : completionPct >= 50 ? '#B07D1A' : '#B8431E'

  function set(key, val) { setForm(f => ({ ...f, [key]: val })) }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true); setError('')
    try {
      await upsertProfile(user.id, { ...form, ...(avatarUrl ? { avatar_url: avatarUrl } : {}) })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      setError(err.message || 'Failed to save profile')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#F7F3EE]">
      <div className="w-8 h-8 border-2 border-[#E2DDD6] border-t-[#1A6B72] rounded-full animate-spin" />
    </div>
  )

  if (!user) return (
    <div className="min-h-screen bg-[#F7F3EE] flex items-center justify-center p-6">
      <div className="text-center max-w-sm">
        <div className="w-14 h-14 rounded-full bg-[#E3F0F1] flex items-center justify-center mx-auto mb-4 text-2xl">👤</div>
        <h2 className="font-serif text-2xl font-bold text-[#0F0F0E] mb-2">Sign in to view your profile</h2>
        <p className="text-sm text-[#5C5C54] mb-6">Manage your account, role, and notification preferences.</p>
        <div className="flex gap-3 justify-center">
          <button onClick={() => setAuthModal('signin')}
            className="px-5 py-2.5 border border-[#E2DDD6] rounded-lg text-sm font-medium text-[#0F0F0E] hover:border-[#5C5C54] bg-white transition">
            Sign In
          </button>
          <button onClick={() => setAuthModal('signup')}
            className="px-5 py-2.5 rounded-lg bg-[#1A6B72] text-white text-sm font-semibold hover:bg-[#155960] transition">
            Join Free
          </button>
        </div>
      </div>
      {authModal && <AuthModal initialTab={authModal} onClose={() => setAuthModal(null)} />}
    </div>
  )

  const roleInfo = ROLES[form.role]
  const initials = (form.full_name || user.email || 'U').slice(0, 2).toUpperCase()

  return (
    <div className="min-h-screen bg-[#F7F3EE]">
      <div className="max-w-2xl mx-auto px-6 py-10">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 mb-8 text-sm text-[#888780]">
          <Link to="/dashboard" className="hover:text-[#1A6B72] transition">Dashboard</Link>
          <span>/</span>
          <span className="text-[#0F0F0E] font-medium">Edit Profile</span>
        </div>

        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          {/* Avatar with upload */}
          <div className="relative flex-shrink-0">
            <div className="w-16 h-16 rounded-2xl overflow-hidden bg-[#1A6B72] flex items-center justify-center">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Profile photo" className="w-full h-full object-cover" />
              ) : (
                <span className="text-white font-bold text-2xl">{initials}</span>
              )}
            </div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={avatarUploading}
              className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-[#1A6B72] text-white flex items-center justify-center text-xs hover:bg-[#155960] transition border-2 border-white"
              title="Upload photo">
              {avatarUploading ? '…' : '📷'}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleAvatarChange}
            />
          </div>
          <div>
            <h1 className="font-serif text-2xl font-bold text-[#0F0F0E]">
              {form.full_name || user.email.split('@')[0]}
            </h1>
            <div className="text-sm text-[#888780]">{user.email}</div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={avatarUploading}
              className="text-xs text-[#1A6B72] hover:underline mt-0.5 transition">
              {avatarUploading ? 'Uploading…' : avatarUrl ? 'Change photo' : 'Upload photo'}
            </button>
            {roleInfo && (
              <span className={`flex items-center gap-1 mt-1 text-xs font-bold px-2 py-0.5 rounded w-fit ${roleInfo.color}`}>
                {roleInfo.icon} {roleInfo.label}
              </span>
            )}
          </div>
        </div>

        {/* Profile Completion */}
        <div className="bg-white border border-[#E2DDD6] rounded-2xl p-5 mb-6">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-semibold text-[#0F0F0E]">Profile Completion</div>
            <div className="text-sm font-bold" style={{ color: completionColor }}>{completionPct}%</div>
          </div>
          <div className="w-full bg-[#E8E4DF] rounded-full h-2 mb-2">
            <div className="h-2 rounded-full transition-all duration-500"
              style={{ width: `${completionPct}%`, background: completionColor }} />
          </div>
          {completionPct < 100 && (
            <div className="text-xs text-[#888780]">
              Fill in {COMPLETION_FIELDS.length - filledCount} more {COMPLETION_FIELDS.length - filledCount === 1 ? 'field' : 'fields'} to complete your profile.
            </div>
          )}
        </div>

        {/* Form */}
        <form onSubmit={handleSave} className="bg-white border border-[#E2DDD6] rounded-2xl divide-y divide-[#F0EDE8]">

          {/* Personal info section */}
          <div className="p-6">
            <div className="text-xs font-bold uppercase tracking-wider text-[#888780] mb-5">Personal Info</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#5C5C54] mb-1.5">Full Name</label>
                <input value={form.full_name} onChange={e => set('full_name', e.target.value)}
                  className="w-full px-3 py-2.5 border border-[#E2DDD6] rounded-lg text-sm focus:outline-none focus:border-[#1A6B72] bg-[#FDFCFB]"
                  placeholder="Your full name" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#5C5C54] mb-1.5">Phone</label>
                <input value={form.phone} onChange={e => set('phone', e.target.value)}
                  className="w-full px-3 py-2.5 border border-[#E2DDD6] rounded-lg text-sm focus:outline-none focus:border-[#1A6B72] bg-[#FDFCFB]"
                  placeholder="+1 (956) 000-0000" type="tel" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#5C5C54] mb-1.5">Email</label>
                <input value={user.email} readOnly
                  className="w-full px-3 py-2.5 border border-[#E2DDD6] rounded-lg text-sm bg-[#F7F3EE] text-[#888780] cursor-not-allowed" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#5C5C54] mb-1.5">City</label>
                <input value={form.city} onChange={e => set('city', e.target.value)}
                  className="w-full px-3 py-2.5 border border-[#E2DDD6] rounded-lg text-sm focus:outline-none focus:border-[#1A6B72] bg-[#FDFCFB]"
                  placeholder="McAllen, TX" />
              </div>
            </div>
          </div>

          {/* Professional section */}
          <div className="p-6">
            <div className="text-xs font-bold uppercase tracking-wider text-[#888780] mb-5">Professional</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#5C5C54] mb-1.5">Role / Account Type</label>
                <select value={form.role} onChange={e => set('role', e.target.value)}
                  className="w-full px-3 py-2.5 border border-[#E2DDD6] rounded-lg text-sm focus:outline-none focus:border-[#1A6B72] bg-[#FDFCFB]">
                  <option value="">Select your role</option>
                  {Object.entries(ROLES).map(([key, r]) => (
                    <option key={key} value={key}>{r.icon} {r.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#5C5C54] mb-1.5">Sector / Industry</label>
                <select value={form.sector} onChange={e => set('sector', e.target.value)}
                  className="w-full px-3 py-2.5 border border-[#E2DDD6] rounded-lg text-sm focus:outline-none focus:border-[#1A6B72] bg-[#FDFCFB]">
                  <option value="">Select your sector</option>
                  {SECTORS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-[#5C5C54] mb-1.5">Job Title / Position</label>
                <input value={form.title} onChange={e => set('title', e.target.value)}
                  className="w-full px-3 py-2.5 border border-[#E2DDD6] rounded-lg text-sm focus:outline-none focus:border-[#1A6B72] bg-[#FDFCFB]"
                  placeholder="CEO, Project Manager, Economic Developer…" />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-[#5C5C54] mb-1.5">Bio</label>
                <textarea value={form.bio} onChange={e => set('bio', e.target.value)} rows={3}
                  className="w-full px-3 py-2.5 border border-[#E2DDD6] rounded-lg text-sm focus:outline-none focus:border-[#1A6B72] bg-[#FDFCFB] resize-none"
                  placeholder="Brief description of your work or interests in the region…" />
              </div>
            </div>
          </div>

          {/* Notifications section */}
          <div className="p-6">
            <div className="text-xs font-bold uppercase tracking-wider text-[#888780] mb-5">Notifications</div>
            <label className="flex items-start gap-3 cursor-pointer group">
              <div className="relative flex-shrink-0 mt-0.5">
                <input type="checkbox" checked={form.email_digest} onChange={e => set('email_digest', e.target.checked)}
                  className="sr-only" />
                <div className={`w-10 h-5.5 rounded-full transition-colors ${form.email_digest ? 'bg-[#1A6B72]' : 'bg-[#D4D0CA]'}`}
                  style={{ height: '22px' }}
                  onClick={() => set('email_digest', !form.email_digest)}>
                  <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform mt-[3px] ${form.email_digest ? 'translate-x-5' : 'translate-x-1'}`} />
                </div>
              </div>
              <div>
                <div className="text-sm font-semibold text-[#0F0F0E]">Weekly Email Digest</div>
                <div className="text-xs text-[#888780] mt-0.5">
                  Receive a weekly summary of new opportunities, companies, and regional economic updates every Monday morning.
                </div>
              </div>
            </label>
          </div>

          {/* Save button */}
          <div className="p-6 flex items-center justify-between">
            {error && <div className="text-sm text-red-600">{error}</div>}
            {saved && <div className="text-sm text-emerald-600 font-medium">Profile saved!</div>}
            {!error && !saved && <div />}
            <button type="submit" disabled={saving}
              className="px-6 py-2.5 bg-[#1A6B72] text-white rounded-lg text-sm font-semibold hover:bg-[#155960] disabled:opacity-60 transition">
              {saving ? 'Saving…' : 'Save Profile'}
            </button>
          </div>

        </form>
      </div>
    </div>
  )
}
