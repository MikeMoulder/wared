import { addDays, localDay } from "./dates";
import type { Approval, AuditEvent, Channel, Entry, Member, Project, State, Task, Triage, Visitor } from "./types";

// All people, companies and projects below are fictional sample data.

export const ROOMS = ["Boardroom", "Meeting Room 1", "Meeting Room 2"];

export const SEED_MEMBERS: Member[] = [
  {
    id: "lina",
    name: "Lina Haddad",
    role: "Contracts Manager",
    email: "lina@example.com",
    handles: "Notices, claims, variations, time-bar issues, disputes, arbitration, anything citing contract clauses.",
  },
  {
    id: "omar",
    name: "Omar Khalil",
    role: "Project Director",
    email: "omar@example.com",
    handles: "Escalations, client and government relations, critical risks, anything that threatens a project or the firm.",
  },
  {
    id: "rania",
    name: "Rania Saleh",
    role: "Senior Quantity Surveyor",
    email: "rania@example.com",
    handles: "Payment applications, invoices, valuations, bank guarantees, securities, cost reports.",
  },
  {
    id: "yousef",
    name: "Yousef Nasser",
    role: "Document Controller",
    email: "yousef@example.com",
    handles: "RFIs, drawings, submittals, transmittals, technical queries, material approvals.",
  },
  {
    id: "dana",
    name: "Dana Aziz",
    role: "Office Manager",
    email: "dana@example.com",
    handles: "Visitors, meetings, deliveries, couriers, facilities, IT, HR and general admin. Default owner if nothing else fits.",
  },
  {
    id: "karim",
    name: "Karim Mansour",
    role: "Business Development Lead",
    email: "karim@example.com",
    handles: "Tenders, proposals, prequalification, partnership enquiries, new clients.",
  },
];

export const SEED_PROJECTS: Project[] = [
  {
    code: "NAMC",
    name: "North Amman Medical Center – Phase 2",
    client: "Northern Health Development Co.",
    contractor: "Stone Horizon Contracting",
    contract: "FIDIC Red Book 2017",
    notes: "We act as the Engineer. RFI responses due within 7 days per Particular Conditions.",
  },
  {
    code: "AQL",
    name: "Aqaba Logistics Hub – Warehouses A–D",
    client: "Red Sea Logistics Holding",
    contractor: "GulfBuild Contracting",
    contract: "FIDIC Yellow Book 2017",
    notes: "We act as the Engineer. RFI responses due within 5 working days (Spec 01 31 19).",
  },
  {
    code: "DSR",
    name: "Dead Sea Wellness Resort",
    client: "Lowest Point Hospitality",
    contractor: "Petra Structures JV",
    contract: "FIDIC Red Book 1999",
    notes: "In ICC arbitration. All dispute correspondence goes to the Contracts Manager, cc Project Director.",
  },
  {
    code: "IWT",
    name: "Irbid Water Treatment PPP",
    client: "Irbid Water PPP SPV",
    contractor: "BlueFlow EPC",
    contract: "FIDIC Yellow Book 1999",
    notes: "We are the Employer's Representative. Lenders' technical adviser must be copied on payment certificates.",
  },
  {
    code: "RYD",
    name: "Riyadh Office Tower",
    client: "Al Wadi Real Estate",
    contractor: "Najd Build",
    contract: "Bespoke contract (Saudi law)",
    notes: "Correspondence mostly in Arabic. Client expects replies within 10 days.",
  },
];

function arDate(iso: string) {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

export interface Sample {
  label: string;
  hint: string;
  channel: Channel;
  text: string;
}

export function samples(today: string): Sample[] {
  return [
    {
      label: "Arabic notice of claim",
      hint: "Letter · NAMC",
      channel: "Letter",
      text: `شركة الأفق الحجري للمقاولات
الرقم: SHC/NAMC/L/0418
التاريخ: ${arDate(addDays(today, -2))}

السادة/ مهندس المشروع المحترمين
مشروع توسعة مركز شمال عمّان الطبي – المرحلة الثانية

الموضوع: إشعار بمطالبة – تأخر تسليم الموقع (المنطقة C)

تحية طيبة وبعد،
استناداً إلى البند الفرعي 20.2.1 من الشروط العامة للعقد (فيديك 2017)، نود إعلامكم بأن صاحب العمل لم يقم بتسليم المنطقة C من الموقع في الموعد المحدد، مما أدى إلى توقف أعمال الحفريات والأساسات في تلك المنطقة منذ ${arDate(addDays(today, -9))}.

وعليه فإننا نحتفظ بحقنا في المطالبة بتمديد مدة الإنجاز وبالتكاليف الإضافية المترتبة على ذلك، وسنقوم بتقديم المطالبة المفصلة مع المستندات الداعمة ضمن المدة التعاقدية.

نرجو التكرم بتأكيد استلام هذا الإشعار.

وتفضلوا بقبول فائق الاحترام،
م. سامر العبادي
مدير المشروع – شركة الأفق الحجري للمقاولات`,
    },
    {
      label: "RFI with a site deadline",
      hint: "Email · AQL",
      channel: "Email",
      text: `From: Mark Ellison <m.ellison@gulfbuild.example>
Subject: RFI-AQL-057 – Rebar clash at grid C4/C5, Warehouse B foundations
Date: ${today}

Dear Sir,

Please find attached RFI-AQL-057. Our site team has identified a clash between the column starter bars shown on structural drawing S-204 Rev C and the drainage pit on civil drawing C-110 Rev B at grid C4/C5.

Concreting of the pile caps at this location is scheduled for ${addDays(today, 6)}. We kindly request the Engineer's clarification within 5 working days so that works are not delayed; otherwise we will have to re-sequence and may notify a delay event.

Regards,
Mark Ellison
Site Engineer, GulfBuild Contracting`,
    },
    {
      label: "Meeting request",
      hint: "Email · AQL",
      channel: "Email",
      text: `From: Hala Mansour <h.mansour@cedararch.example>
Subject: Design review – Warehouse C/D façade package
Date: ${today}

Hi,

Can we schedule a design review for the Warehouse C/D façade package with the project team next week? We'd need the Engineer's structural and MEP leads, and someone from the client side if possible.

Tuesday or Wednesday morning works best for us; two hours should be enough.

Best,
Hala Mansour
Design Manager, Cedar Architects`,
    },
    {
      label: "Phone call note",
      hint: "Call · new enquiry",
      channel: "Phone call",
      text: `Call at reception, 10:20
Caller: Ahmad Nabulsi, Levant Cost Consultants (number left with reception)
Asked who handles contract administration. They are bidding on a hospital project in Irbid and want to discuss outsourcing contract administration and claims support, delivered in Arabic.
Wants a call back today or tomorrow and asked us to email our company profile.`,
    },
    {
      label: "Courier at reception",
      hint: "WhatsApp · mixed AR/EN",
      channel: "WhatsApp",
      text: `السلام عليكم، معكم مندوب شركة الشحن 🚚
في طرد وصل عالاستقبال: 2 كرتونة مستندات مختومة من مكتب قاسم وشركاه للمحاماة (Qasem & Co. Advocates) باسم م. لينا
مكتوب عليها "URGENT – Respondent's Statement of Defence – DSR arbitration"
بدي توقيع استلام قبل الساعة 4 لو سمحتوا`,
    },
    {
      label: "Interim payment application",
      hint: "Letter · IWT",
      channel: "Letter",
      text: `BlueFlow EPC
Our ref: BLU/IWT/IPA-07
Date: ${today}

To: The Employer's Representative
Irbid Water Treatment PPP

Subject: Interim Payment Application No. 7 – period ending ${addDays(today, -1)}

Dear Sirs,

Pursuant to Sub-Clause 14.3 of the Conditions of Contract, we hereby submit our Statement for Interim Payment Application No. 7, together with supporting documents (progress measurement, materials on site schedule, and updated cash-flow forecast).

Gross value of work executed to date: JOD 18,904,220.000
Amount due this period (net of retention and advance recovery): JOD 1,284,560.000

We kindly request that the Interim Payment Certificate be issued within the contractual period.

Yours faithfully,
Eng. Tareq Mustafa
Commercial Manager, BlueFlow EPC`,
    },
  ];
}

const blank: Omit<Triage, "subject" | "docType" | "urgency" | "routeTo"> = {
  reference: "",
  documentDate: "",
  language: "en",
  senderName: "",
  senderOrg: "",
  projectCode: "",
  projectConfidence: 1,
  urgencyReason: "",
  summaryEn: "",
  summaryAr: "",
  keyPoints: [],
  deadlines: [],
  routeReason: "",
  cc: [],
  actions: [],
  risks: [],
  ackEn: "",
  ackAr: "",
};

export function seedEntries(today: string, now: Date): Entry[] {
  const d = (n: number) => addDays(today, n);
  const callDay = localDay(new Date(now.getTime() - 50 * 60000).toISOString());
  const e = (x: Partial<Entry> & Pick<Entry, "id" | "subject" | "docType" | "urgency" | "routeTo" | "receivedAt">): Entry => ({
    ...blank,
    channel: "Email",
    status: "Routed",
    original: "(sample entry)",
    loggedAt: new Date(Math.min(new Date(x.receivedAt + "T09:10:00").getTime(), now.getTime() - 50 * 60000)).toISOString(),
    documentDate: x.receivedAt,
    ...x,
  });

  return [
    e({
      id: "IN-2026-0137",
      receivedAt: d(-12),
      channel: "Letter",
      subject: "Notice of claim – EOT for late approval of shop drawings",
      reference: "SHC/NAMC/L/0402",
      senderName: "Samer Al-Abbadi",
      senderOrg: "Stone Horizon Contracting",
      docType: "Notice / Claim",
      projectCode: "NAMC",
      urgency: "high",
      urgencyReason: "Clause 20.2.2 time-bar window for the Engineer is running.",
      summaryEn:
        "Contractor gives Notice of Claim under Sub-Clause 20.2.1 for extension of time, alleging late approval of MEP shop drawings (batch 3).",
      summaryAr: "يقدّم المقاول إشعار مطالبة بموجب البند 20.2.1 لتمديد مدة الإنجاز بسبب التأخر في اعتماد المخططات التنفيذية للأعمال الكهروميكانيكية (الدفعة 3).",
      deadlines: [
        {
          description: "Engineer's notice if the claim is considered time-barred",
          anchorDate: d(-12),
          days: 14,
          dueDate: d(2),
          basis: "FIDIC 2017 Sub-Clause 20.2.2",
          owner: "us",
        },
        {
          description: "Contractor's fully detailed claim due",
          anchorDate: d(-12),
          days: 84,
          dueDate: d(72),
          basis: "FIDIC 2017 Sub-Clause 20.2.4",
          owner: "sender",
        },
      ],
      routeTo: "lina",
      routeReason: "Contractual notice of claim.",
      cc: ["omar"],
      actions: ["Check approval dates for batch 3 against the submittal log", "Decide on time-bar position before the 14-day window closes"],
      risks: ["If no time-bar notice is issued within 14 days, the Notice is deemed valid."],
    }),
    e({
      id: "IN-2026-0138",
      receivedAt: d(-9),
      subject: "RFI-AQL-054 – Waterproofing membrane spec for Warehouse A roof",
      reference: "RFI-AQL-054",
      senderName: "Mark Ellison",
      senderOrg: "GulfBuild Contracting",
      docType: "RFI / Clarification",
      projectCode: "AQL",
      urgency: "normal",
      summaryEn: "Contractor asks whether the specified TPO membrane may be substituted with an equivalent PVC system due to supply lead times.",
      summaryAr: "يستفسر المقاول عن إمكانية استبدال غشاء العزل TPO المحدد بنظام PVC مكافئ بسبب مدة التوريد.",
      deadlines: [
        {
          description: "Engineer's response to RFI",
          anchorDate: d(-9),
          days: 7,
          dueDate: d(-2),
          basis: "Spec 01 31 19 – 5 working days",
          owner: "us",
        },
      ],
      routeTo: "yousef",
      routeReason: "Technical RFI.",
      actions: ["Get the design team's view on PVC equivalence"],
    }),
    e({
      id: "IN-2026-0139",
      receivedAt: d(-6),
      channel: "Courier",
      status: "Acknowledged",
      subject: "Advance payment guarantee – bank amendment extending validity",
      senderOrg: "Arab Commerce Bank",
      docType: "Payment / Invoice",
      projectCode: "IWT",
      urgency: "normal",
      summaryEn: "Bank amendment extending the contractor's advance payment guarantee to the new expiry date.",
      summaryAr: "تعديل من البنك لتمديد صلاحية كفالة الدفعة المقدمة الخاصة بالمقاول.",
      deadlines: [
        { description: "Guarantee expiry", anchorDate: "", days: 0, dueDate: d(20), basis: "Stated in bank amendment", owner: "other" },
      ],
      routeTo: "rania",
      routeReason: "Bank guarantees and securities.",
      actions: ["File original in the securities safe", "Update the guarantee tracker"],
    }),
    e({
      id: "IN-2026-0140",
      receivedAt: d(-3),
      channel: "WhatsApp",
      status: "Closed",
      subject: "ISP technician visit – office internet outage",
      senderOrg: "Office ISP",
      docType: "HR / Admin",
      urgency: "low",
      summaryEn: "ISP confirms a technician visit to fix the intermittent fibre connection on the 3rd floor.",
      summaryAr: "يؤكد مزود الإنترنت زيارة فني لإصلاح انقطاع الألياف الضوئية في الطابق الثالث.",
      routeTo: "dana",
      routeReason: "Facilities / IT.",
    }),
    e({
      id: "IN-2026-0141",
      receivedAt: d(-1),
      status: "New",
      language: "ar",
      subject: "طلب اجتماع لمناقشة البرنامج الزمني المحدّث",
      senderName: "م. فهد القحطاني",
      senderOrg: "Najd Build",
      docType: "Meeting / Visit",
      projectCode: "RYD",
      urgency: "normal",
      summaryEn: "Contractor requests a meeting to present the revised programme (Rev 4) showing a 6-week slip on the podium works.",
      summaryAr: "يطلب المقاول عقد اجتماع لعرض البرنامج الزمني المعدّل (المراجعة 4) الذي يُظهر تأخراً بمقدار 6 أسابيع في أعمال المنصة.",
      deadlines: [
        { description: "Reply to meeting request", anchorDate: d(-1), days: 10, dueDate: d(9), basis: "Client expectation – 10 days", owner: "us" },
      ],
      routeTo: "omar",
      routeReason: "Programme slip on a key project.",
      cc: ["lina"],
      risks: ["A 6-week slip may lead to an EOT claim; review the programme before the meeting."],
      ackAr:
        "نؤكد استلام كتابكم بتاريخ " +
        d(-1) +
        " بخصوص طلب عقد اجتماع لمناقشة البرنامج الزمني المحدّث لمشروع برج الرياض المكتبي. سيتم التواصل معكم لتحديد موعد مناسب. دون إجحاف بحقوق صاحب العمل بموجب العقد.\n\nمراقبة الوثائق",
      ackEn:
        "We acknowledge receipt of your letter dated " +
        d(-1) +
        " requesting a meeting to discuss the updated programme for the Riyadh Office Tower. We will contact you to arrange a suitable time. This is without prejudice to the Employer's rights under the Contract.\n\nDocument Control",
    }),
    e({
      id: "IN-2026-0142",
      receivedAt: callDay,
      channel: "Phone call",
      subject: "Caller asking for contract administration contact",
      senderName: "Rami Haddadin",
      senderOrg: "Jordan Valley Developers",
      docType: "Tender / Proposal",
      urgency: "normal",
      urgencyReason: "Prospective client; asked for a call back within 2 days.",
      summaryEn: "Prospective client asked who handles contract administration; they are planning a mixed-use development and want a proposal for contract administration services.",
      summaryAr: "استفسر عميل محتمل عن المسؤول عن إدارة العقود، حيث يخطط لمشروع متعدد الاستخدامات ويرغب في الحصول على عرض لخدمات إدارة العقود.",
      deadlines: [
        { description: "Call back the prospective client", anchorDate: callDay, days: 2, dueDate: addDays(callDay, 2), basis: "Caller requested a call back within 2 days", owner: "us" },
      ],
      routeTo: "karim",
      routeReason: "New business enquiry.",
      cc: ["lina"],
      actions: ["Call Rami back and qualify the opportunity"],
    }),
  ];
}

/* ------------------------------------------------------------------ */
/* Full demo state: tasks, approvals, visitors and an audit trail that  */
/* are consistent with the seeded register entries.                     */
/* ------------------------------------------------------------------ */

export function seedState(today: string, realNow: Date): State {
  const d = (n: number) => addDays(today, n);
  const at = (day: string, hh: number, mm = 0) => new Date(`${day}T${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}:00`);

  // Keep the demo inside office hours: before 09:00 the "recent" activity happened yesterday afternoon;
  // after 18:00 the day's visitors have gone home and the next one is booked for tomorrow.
  const hour = realNow.getHours();
  const early = hour < 9;
  const late = hour >= 18;
  const now = early ? at(d(-1), 16, 30) : realNow;
  const ago = (mins: number) => new Date(now.getTime() - mins * 60000).toISOString();
  const onDay = (n: number, hh: number, mm = 0) => new Date(Math.min(at(d(n), hh, mm).getTime(), now.getTime() - 5 * 60000)).toISOString();

  const entries = seedEntries(today, now);

  const tasks: Task[] = [
    { id: "FU-0031", title: "Decide time-bar position on Notice of Claim (Sub-Clause 20.2.2)", owner: "lina", dueDate: d(2), priority: "high", source: "IN-2026-0137", basis: "FIDIC 2017 Sub-Clause 20.2.2", status: "open", createdBy: "ai", createdAt: onDay(-12, 9, 12) },
    { id: "FU-0032", title: "Respond to RFI-AQL-054 (waterproofing membrane)", owner: "yousef", dueDate: d(-2), priority: "normal", source: "IN-2026-0138", basis: "Spec 01 31 19", status: "open", createdBy: "ai", createdAt: onDay(-9, 9, 12) },
    { id: "FU-0033", title: "Update guarantee tracker and file original in safe", owner: "rania", dueDate: d(-5), priority: "normal", source: "IN-2026-0139", status: "done", createdBy: "ai", createdAt: onDay(-6, 11, 4), doneAt: onDay(-5, 14, 30) },
    { id: "FU-0034", title: "Confirm ISP technician visit", owner: "dana", dueDate: d(-2), priority: "low", source: "IN-2026-0140", status: "done", createdBy: "ai", createdAt: onDay(-3, 10, 2), doneAt: onDay(-2, 12, 0) },
    { id: "FU-0035", title: "Reply to Najd Build meeting request", owner: "omar", dueDate: d(9), priority: "normal", source: "IN-2026-0141", basis: "Client expectation – 10 days", status: "open", createdBy: "ai", createdAt: onDay(-1, 9, 12) },
    { id: "FU-0036", title: "Call back Rami Haddadin (Jordan Valley Developers)", owner: "karim", dueDate: entries.find((e) => e.id === "IN-2026-0142")!.deadlines[0].dueDate, priority: "normal", source: "IN-2026-0142", status: "open", createdBy: "ai", createdAt: ago(48) },
    { id: "FU-0037", title: "Renew company vehicle insurance (2 cars)", owner: "dana", dueDate: d(5), priority: "high", source: "Renewals", status: "open", createdBy: "human", createdAt: onDay(-4, 9, 30) },
    { id: "FU-0038", title: "Renew Jordan Engineers Association membership certificates", owner: "dana", dueDate: d(18), priority: "normal", source: "Renewals", status: "open", createdBy: "human", createdAt: onDay(-4, 9, 32) },
  ];

  const e137 = entries.find((e) => e.id === "IN-2026-0137")!;
  const e141 = entries.find((e) => e.id === "IN-2026-0141")!;
  e137.ackEn = `We acknowledge receipt of your letter Ref. SHC/NAMC/L/0402 dated ${d(-12)} giving Notice of Claim under Sub-Clause 20.2.1. This acknowledgement is issued without prejudice to the Employer's and the Engineer's rights under the Contract.\n\nDocument Control`;
  e137.ackAr = `نقر باستلام كتابكم رقم SHC/NAMC/L/0402 بتاريخ ${d(-12)} المتضمن إشعاراً بمطالبة بموجب البند الفرعي 20.2.1. يصدر هذا الإقرار دون إجحاف بحقوق صاحب العمل والمهندس بموجب العقد.\n\nمراقبة الوثائق`;

  const approvals: Approval[] = [
    {
      id: "AP-0019", kind: "external_reply", ref: "IN-2026-0137", title: "Acknowledge Notice of Claim to Stone Horizon Contracting",
      reason: "Contractual correspondence: any reply to a claim or notice needs a human sign-off.",
      recipient: "Stone Horizon Contracting", draftEn: e137.ackEn, draftAr: e137.ackAr, lang: "en", status: "pending", createdAt: onDay(-12, 9, 12),
    },
    {
      id: "AP-0020", kind: "external_reply", ref: "IN-2026-0139", title: "Acknowledge guarantee amendment to Arab Commerce Bank",
      reason: "External communication: replies leave the office only after approval.",
      recipient: "Arab Commerce Bank", draftEn: "We acknowledge receipt of your amendment extending the validity of the advance payment guarantee.\n\nDocument Control", draftAr: "", lang: "en", status: "approved", createdAt: onDay(-6, 11, 4), decidedAt: onDay(-6, 11, 40),
    },
    {
      id: "AP-0021", kind: "external_reply", ref: "IN-2026-0141", title: "Acknowledge meeting request to Najd Build",
      reason: "External communication: replies leave the office only after approval.",
      recipient: "Najd Build", draftEn: e141.ackEn, draftAr: e141.ackAr, lang: "ar", status: "pending", createdAt: onDay(-1, 9, 12),
    },
  ];

  const visitors: Visitor[] = [
    { id: "VS-0051", name: "Eng. Nour Al-Zoubi", company: "Stone Horizon Contracting", host: "lina", purpose: "Hand-over of claim particulars (NAMC)", projectCode: "NAMC", room: "Meeting Room 1", expectedAt: ago(200), arrivedAt: ago(195), leftAt: ago(130), status: "left" },
    early
      ? { id: "VS-0052", name: "Mark Ellison", company: "GulfBuild Contracting", host: "yousef", purpose: "RFI walkthrough – Warehouse B", projectCode: "AQL", room: "Meeting Room 2", expectedAt: at(d(0), 10, 0).toISOString(), status: "expected" }
      : late
        ? { id: "VS-0052", name: "Mark Ellison", company: "GulfBuild Contracting", host: "yousef", purpose: "RFI walkthrough – Warehouse B", projectCode: "AQL", room: "Meeting Room 2", expectedAt: ago(300), arrivedAt: ago(295), leftAt: ago(210), status: "left" }
        : { id: "VS-0052", name: "Mark Ellison", company: "GulfBuild Contracting", host: "yousef", purpose: "RFI walkthrough – Warehouse B", projectCode: "AQL", room: "Meeting Room 2", expectedAt: ago(45), arrivedAt: ago(38), status: "on-site" },
    { id: "VS-0053", name: "Rami Haddadin", company: "Jordan Valley Developers", host: "karim", purpose: "Introductory meeting – contract administration services", projectCode: "", room: "Boardroom", expectedAt: (early ? at(d(0), 12, 30) : late ? at(d(1), 11, 0) : new Date(now.getTime() + 95 * 60000)).toISOString(), status: "expected" },
    { id: "VS-0054", name: "Hiba Qasem", company: "Cedar Audit & Tax", host: "rania", purpose: "Quarterly VAT file review", projectCode: "", room: "Meeting Room 1", expectedAt: new Date(d(1) + "T10:00:00").toISOString(), status: "expected" },
  ];

  const audit: AuditEvent[] = [];
  const ev = (at: string, actor: "ai" | "human", action: string, detail: string, ref?: string, minutesSaved?: number) =>
    audit.push({ id: `EV-${audit.length + 1}`, at, actor, action, detail, ref, minutesSaved });

  for (const en of entries) {
    const owner = SEED_MEMBERS.find((m) => m.id === en.routeTo)?.name ?? en.routeTo;
    ev(en.loggedAt, "ai", "Classified & logged", `${en.docType} · ${en.projectCode || "no project"} · ${en.urgency}`, en.id, 6);
    ev(en.loggedAt, "ai", "Routed", `To ${owner}${en.cc.length ? ` (cc ${en.cc.length})` : ""}: ${en.routeReason}`, en.id, 2);
  }
  for (const t of tasks.filter((t) => t.createdBy === "ai")) ev(t.createdAt, "ai", "Follow-up created", `${t.id}: ${t.title}`, t.source, 2);
  for (const t of tasks.filter((t) => t.createdBy === "human")) ev(t.createdAt, "human", "Follow-up created", `${t.id}: ${t.title}`, t.id);
  for (const a of approvals) ev(a.createdAt, "ai", "Reply drafted → approval", `${a.id}: ${a.reason}`, a.ref, 5);
  ev(onDay(-6, 11, 40), "human", "Approved & sent", "AP-0020 acknowledgement to Arab Commerce Bank", "IN-2026-0139");
  for (const t of tasks.filter((t) => t.doneAt)) ev(t.doneAt!, "human", "Follow-up completed", `${t.id}: ${t.title}`, t.source);
  ev(onDay(-2, 12, 5), "human", "Status changed", "Routed → Closed", "IN-2026-0140");
  ev(ago(195), "human", "Visitor checked in", "Eng. Nour Al-Zoubi (Stone Horizon) · host Lina Haddad notified", "VS-0051", 2);
  ev(ago(130), "human", "Visitor checked out", "Eng. Nour Al-Zoubi", "VS-0051");
  if (!early) ev(late ? ago(295) : ago(38), "human", "Visitor checked in", "Mark Ellison (GulfBuild) · host Yousef Nasser notified", "VS-0052", 2);
  if (late) ev(ago(210), "human", "Visitor checked out", "Mark Ellison", "VS-0052");
  audit.sort((a, b) => b.at.localeCompare(a.at));

  return { members: SEED_MEMBERS, projects: SEED_PROJECTS, entries, tasks, approvals, audit, visitors };
}
