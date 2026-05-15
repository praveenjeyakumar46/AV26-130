import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faUser, faEnvelope, faPhone, faBirthdayCake, faMapMarkerAlt,
  faGraduationCap, faTrophy, faUsers, faPen, faSave, faTimes,
  faArrowRightFromBracket, faPlus, faTrash, faChevronDown, faChevronUp,
} from '@fortawesome/free-solid-svg-icons';

// ── Types ─────────────────────────────────────────────────────────────────────

interface AcademicRecord {
  id: string;
  level: string;
  institution: string;
  board: string;
  year: string;
  percentage: string;
  remarks: string;
}

interface ParentDetail {
  relation: string;
  name: string;
  occupation: string;
  mobile: string;
  email: string;
}

interface ProfileData {
  fullName: string;
  dob: string;
  gender: string;
  mobile: string;
  altMobile: string;
  email: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  academics: AcademicRecord[];
  parents: ParentDetail[];
}

const EMPTY_ACADEMIC: AcademicRecord = {
  id: '', level: '', institution: '', board: '', year: '', percentage: '', remarks: '',
};

const EMPTY_PARENT: ParentDetail = {
  relation: 'Father', name: '', occupation: '', mobile: '', email: '',
};

const DEFAULT_PROFILE: ProfileData = {
  fullName: '', dob: '', gender: '', mobile: '', altMobile: '',
  email: '', address: '', city: '', state: '', pincode: '',
  academics: [],
  parents: [{ ...EMPTY_PARENT }],
};

// ── Per-user storage key ──────────────────────────────────────────────────────
// Each account gets its OWN key: "nyria_profile:<email>"
// This means no two accounts ever share or overwrite each other's profile data.

const profileKey = (userEmail: string) =>
  `nyria_profile:${userEmail.trim().toLowerCase()}`;

const loadForUser = (userEmail: string): ProfileData => {
  try {
    const raw = localStorage.getItem(profileKey(userEmail));
    if (!raw) return { ...DEFAULT_PROFILE };
    return { ...DEFAULT_PROFILE, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_PROFILE };
  }
};

const saveForUser = (userEmail: string, data: ProfileData) => {
  try {
    localStorage.setItem(profileKey(userEmail), JSON.stringify(data));
  } catch {}
};

// ── Sub-components ────────────────────────────────────────────────────────────

const Field = ({ label, value }: { label: string; value: string }) => (
  <div>
    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">{label}</p>
    <p className="font-medium text-foreground">{value || <span className="text-muted-foreground italic">—</span>}</p>
  </div>
);

const Input = ({
  label, value, onChange, type = 'text', placeholder = '', required = false,
}: {
  label: string; value: string; onChange: (v: string) => void;
  type?: string; placeholder?: string; required?: boolean;
}) => (
  <div className="space-y-1">
    <label className="text-xs font-semibold text-foreground uppercase tracking-wide">
      {label}{required && <span className="text-destructive ml-0.5">*</span>}
    </label>
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder || label}
      className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
    />
  </div>
);

const Select = ({
  label, value, onChange, options,
}: {
  label: string; value: string; onChange: (v: string) => void; options: string[];
}) => (
  <div className="space-y-1">
    <label className="text-xs font-semibold text-foreground uppercase tracking-wide">{label}</label>
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
    >
      <option value="">Select {label}</option>
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  </div>
);

const SectionCard = ({
  icon, title, children, defaultOpen = true,
}: {
  icon: any; title: string; children: React.ReactNode; defaultOpen?: boolean;
}) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-6 py-4 hover:bg-muted/40 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg gradient-primary flex items-center justify-center text-white shrink-0">
            <FontAwesomeIcon icon={icon} className="text-sm" />
          </div>
          <span className="font-bold text-foreground text-base">{title}</span>
        </div>
        <FontAwesomeIcon icon={open ? faChevronUp : faChevronDown} className="text-muted-foreground text-sm" />
      </button>
      {open && <div className="px-6 pb-6 pt-2">{children}</div>}
    </div>
  );
};

// ── Main Component ────────────────────────────────────────────────────────────

const Profile = () => {
  const navigate = useNavigate();

  // Read identity once — these never change during the session
  const authEmail = localStorage.getItem('auth_user') || '';
  const authName  = localStorage.getItem('auth_name') || '';

  // Load THIS user's profile from their own isolated storage key
  const [profile, setProfile] = useState<ProfileData>(() => loadForUser(authEmail));
  const [editing, setEditing] = useState(false);
  const [draft,   setDraft]   = useState<ProfileData>(() => loadForUser(authEmail));
  const [isNew,   setIsNew]   = useState(false);

  // On mount: if the current user has never filled their profile, open edit mode
  // with a blank form pre-seeded only with their own auth name/email.
  useEffect(() => {
    const stored = loadForUser(authEmail);
    if (!stored.fullName && !stored.mobile) {
      // Genuinely new profile for this account — start blank
      const fresh: ProfileData = {
        ...DEFAULT_PROFILE,
        parents: [{ ...EMPTY_PARENT }],
        fullName: authName,   // pre-fill only from their own signup name
        email: authEmail,     // pre-fill only their own email
      };
      setProfile(fresh);
      setDraft(fresh);
      setIsNew(true);
      setEditing(true);
    } else {
      // Returning user — load their own saved data
      setProfile(stored);
      setDraft(stored);
      setIsNew(false);
      setEditing(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authEmail]); // re-runs if authEmail changes (i.e. different user logs in)

  const handleSave = () => {
    saveForUser(authEmail, draft);  // always saves to THIS user's key
    setProfile(draft);
    setEditing(false);
    setIsNew(false);
  };

  const handleCancel = () => {
    setDraft(profile);
    setEditing(false);
  };

  const handleLogout = () => {
    try {
      localStorage.removeItem('auth_user');
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_name');
    } catch {}
    navigate('/login');
  };

  // Academic helpers
  const addAcademic = () =>
    setDraft(d => ({
      ...d,
      academics: [...d.academics, { ...EMPTY_ACADEMIC, id: Date.now().toString() }],
    }));

  const updateAcademic = (idx: number, field: keyof AcademicRecord, val: string) =>
    setDraft(d => {
      const arr = [...d.academics];
      arr[idx] = { ...arr[idx], [field]: val };
      return { ...d, academics: arr };
    });

  const removeAcademic = (idx: number) =>
    setDraft(d => ({ ...d, academics: d.academics.filter((_, i) => i !== idx) }));

  // Parent helpers
  const addParent = () =>
    setDraft(d => ({ ...d, parents: [...d.parents, { ...EMPTY_PARENT }] }));

  const updateParent = (idx: number, field: keyof ParentDetail, val: string) =>
    setDraft(d => {
      const arr = [...d.parents];
      arr[idx] = { ...arr[idx], [field]: val };
      return { ...d, parents: arr };
    });

  const removeParent = (idx: number) =>
    setDraft(d => ({ ...d, parents: d.parents.filter((_, i) => i !== idx) }));

  const p = editing ? draft : profile;

  // ── VIEW MODE ──────────────────────────────────────────────────────────────
  const viewMode = (
    <div className="space-y-4">

      <SectionCard icon={faUser} title="Personal Details">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-4">
          <Field label="Full Name"       value={p.fullName} />
          <Field label="Date of Birth"   value={p.dob} />
          <Field label="Gender"          value={p.gender} />
          <Field label="Mobile"          value={p.mobile} />
          <Field label="Alternate Mobile" value={p.altMobile} />
          <Field label="Email"           value={p.email || authEmail} />
          <div className="col-span-2 md:col-span-3">
            <Field label="Address" value={[p.address, p.city, p.state, p.pincode].filter(Boolean).join(', ')} />
          </div>
        </div>
      </SectionCard>

      <SectionCard icon={faGraduationCap} title="Academic Achievements">
        {profile.academics.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">No academic records added yet.</p>
        ) : (
          <div className="space-y-4">
            {profile.academics.map((a, i) => (
              <div key={i} className="border border-border rounded-xl p-4 grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-3">
                <Field label="Level / Degree"    value={a.level} />
                <Field label="Institution"        value={a.institution} />
                <Field label="Board / University" value={a.board} />
                <Field label="Year"               value={a.year} />
                <Field label="Percentage / CGPA"  value={a.percentage} />
                <Field label="Remarks"            value={a.remarks} />
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      <SectionCard icon={faUsers} title="Parents / Guardian Details">
        {profile.parents.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">No parent details added yet.</p>
        ) : (
          <div className="space-y-4">
            {profile.parents.map((par, i) => (
              <div key={i} className="border border-border rounded-xl p-4 grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-3">
                <Field label="Relation"   value={par.relation} />
                <Field label="Name"       value={par.name} />
                <Field label="Occupation" value={par.occupation} />
                <Field label="Mobile"     value={par.mobile} />
                <Field label="Email"      value={par.email} />
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      <div className="flex items-center justify-between pt-2">
        <button
          onClick={() => { setDraft(profile); setEditing(true); }}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg gradient-primary text-white font-semibold shadow-glow hover:scale-[1.01] active:scale-[0.99] transition-transform"
        >
          <FontAwesomeIcon icon={faPen} />
          <span>Edit Profile</span>
        </button>
        <button
          onClick={handleLogout}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-border text-foreground hover:bg-muted transition-colors"
        >
          <FontAwesomeIcon icon={faArrowRightFromBracket} />
          <span>Sign out</span>
        </button>
      </div>
    </div>
  );

  // ── EDIT MODE ──────────────────────────────────────────────────────────────
  const editMode = (
    <div className="space-y-4">

      <SectionCard icon={faUser} title="Personal Details">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          <Input label="Full Name"       value={draft.fullName}  onChange={v => setDraft(d => ({ ...d, fullName: v }))}  required />
          <Input label="Date of Birth"   value={draft.dob}       onChange={v => setDraft(d => ({ ...d, dob: v }))}       type="date" />
          <Select label="Gender"         value={draft.gender}    onChange={v => setDraft(d => ({ ...d, gender: v }))}
            options={['Male', 'Female', 'Other', 'Prefer not to say']} />
          <Input label="Mobile"          value={draft.mobile}    onChange={v => setDraft(d => ({ ...d, mobile: v }))}    type="tel" required />
          <Input label="Alternate Mobile" value={draft.altMobile} onChange={v => setDraft(d => ({ ...d, altMobile: v }))} type="tel" />
          <Input label="Email"           value={draft.email || authEmail} onChange={v => setDraft(d => ({ ...d, email: v }))} type="email" />
          <div className="sm:col-span-2 md:col-span-3">
            <Input label="Address" value={draft.address} onChange={v => setDraft(d => ({ ...d, address: v }))} placeholder="Street / Flat / Area" />
          </div>
          <Input label="City"    value={draft.city}    onChange={v => setDraft(d => ({ ...d, city: v }))} />
          <Input label="State"   value={draft.state}   onChange={v => setDraft(d => ({ ...d, state: v }))} />
          <Input label="Pincode" value={draft.pincode} onChange={v => setDraft(d => ({ ...d, pincode: v }))} />
        </div>
      </SectionCard>

      <SectionCard icon={faGraduationCap} title="Academic Achievements">
        <div className="space-y-4">
          {draft.academics.map((a, i) => (
            <div key={i} className="border border-border rounded-xl p-4 space-y-3 relative">
              <button type="button" onClick={() => removeAcademic(i)}
                className="absolute top-3 right-3 text-destructive hover:text-destructive/70 transition-colors" title="Remove">
                <FontAwesomeIcon icon={faTrash} className="text-sm" />
              </button>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                <Input label="Level / Degree"    value={a.level}      onChange={v => updateAcademic(i, 'level', v)}      placeholder="e.g. 10th, 12th, B.A. LLB" />
                <Input label="Institution"        value={a.institution} onChange={v => updateAcademic(i, 'institution', v)} />
                <Input label="Board / University" value={a.board}      onChange={v => updateAcademic(i, 'board', v)} />
                <Input label="Year of Passing"    value={a.year}       onChange={v => updateAcademic(i, 'year', v)}       placeholder="e.g. 2023" />
                <Input label="Percentage / CGPA"  value={a.percentage} onChange={v => updateAcademic(i, 'percentage', v)} placeholder="e.g. 85% or 8.5 CGPA" />
                <Input label="Remarks / Achievements" value={a.remarks} onChange={v => updateAcademic(i, 'remarks', v)}  placeholder="e.g. Distinction, Gold Medal" />
              </div>
            </div>
          ))}
          <button type="button" onClick={addAcademic}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-dashed border-primary text-primary hover:bg-primary/5 transition-colors text-sm font-medium">
            <FontAwesomeIcon icon={faPlus} />
            Add Academic Record
          </button>
        </div>
      </SectionCard>

      <SectionCard icon={faUsers} title="Parents / Guardian Details">
        <div className="space-y-4">
          {draft.parents.map((par, i) => (
            <div key={i} className="border border-border rounded-xl p-4 space-y-3 relative">
              {draft.parents.length > 1 && (
                <button type="button" onClick={() => removeParent(i)}
                  className="absolute top-3 right-3 text-destructive hover:text-destructive/70 transition-colors" title="Remove">
                  <FontAwesomeIcon icon={faTrash} className="text-sm" />
                </button>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                <Select label="Relation" value={par.relation} onChange={v => updateParent(i, 'relation', v)}
                  options={['Father', 'Mother', 'Guardian']} />
                <Input label="Full Name"   value={par.name}       onChange={v => updateParent(i, 'name', v)} />
                <Input label="Occupation"  value={par.occupation} onChange={v => updateParent(i, 'occupation', v)} />
                <Input label="Mobile Number" value={par.mobile}   onChange={v => updateParent(i, 'mobile', v)} type="tel" />
                <Input label="Email"       value={par.email}      onChange={v => updateParent(i, 'email', v)} type="email" />
              </div>
            </div>
          ))}
          <button type="button" onClick={addParent}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-dashed border-primary text-primary hover:bg-primary/5 transition-colors text-sm font-medium">
            <FontAwesomeIcon icon={faPlus} />
            Add Parent / Guardian
          </button>
        </div>
      </SectionCard>

      <div className="flex items-center gap-3 pt-2">
        <button onClick={handleSave}
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg gradient-primary text-white font-semibold shadow-glow hover:scale-[1.01] active:scale-[0.99] transition-transform">
          <FontAwesomeIcon icon={faSave} />
          Save Profile
        </button>
        {!isNew && (
          <button onClick={handleCancel}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border border-border text-foreground hover:bg-muted transition-colors font-medium">
            <FontAwesomeIcon icon={faTimes} />
            Cancel
          </button>
        )}
      </div>
    </div>
  );

  // ── RENDER ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen pt-6 pb-16 text-foreground">
      <div className="max-w-4xl mx-auto px-4 space-y-5">

        {/* Header */}
        <div className="bg-card border border-border rounded-2xl shadow-lg p-6 flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl gradient-primary shadow-glow flex items-center justify-center text-white shrink-0 text-2xl font-bold">
            {(profile.fullName || authName || 'U')[0].toUpperCase()}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{profile.fullName || authName || 'My Profile'}</h1>
            <p className="text-sm text-muted-foreground">{authEmail}</p>
            {isNew && (
              <p className="text-xs text-primary font-medium mt-1">
                👋 Welcome! Please fill in your details below to get started.
              </p>
            )}
          </div>
        </div>

        {/* Body */}
        {editing ? editMode : viewMode}
      </div>
    </div>
  );
};

export default Profile;
