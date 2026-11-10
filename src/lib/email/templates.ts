/** Szablony e-maili: treść edytowalna w panelu, zmienne w postaci {{nazwa}}. */

export interface TemplateDef {
  label: string;
  subject: string;
  body: string;
}

const FOOTER_VARS = "{{firma}}, {{adres}}, {{telefony}}";

export const TEMPLATE_VARIABLES =
  "{{imie}}, {{termin}}, {{uslugi}}, {{pojazd}}, {{status}}, {{link}}, {{anulowanie_do}}, " + FOOTER_VARS;

export const DEFAULT_TEMPLATES: Record<string, TemplateDef> = {
  booking_received: {
    label: "Klient: rezerwacja przyjęta (czeka na potwierdzenie)",
    subject: "Przyjęliśmy Twoją rezerwację – {{termin}}",
    body: `Dzień dobry {{imie}},

dziękujemy za rezerwację w {{firma}}. Zgłoszenie czeka na potwierdzenie przez warsztat – damy znać osobnym e-mailem.

Termin: {{termin}}
Usługi: {{uslugi}}
Pojazd: {{pojazd}}

Podgląd i anulowanie rezerwacji (bezpłatnie do {{anulowanie_do}}):
{{link}}`,
  },
  booking_confirmed: {
    label: "Klient: rezerwacja potwierdzona",
    subject: "Rezerwacja potwierdzona – {{termin}}",
    body: `Dzień dobry {{imie}},

potwierdzamy wizytę w {{firma}}. W załączniku znajdziesz plik do dodania terminu do kalendarza.

Termin: {{termin}}
Usługi: {{uslugi}}
Pojazd: {{pojazd}}

Podgląd i anulowanie rezerwacji (bezpłatnie do {{anulowanie_do}}):
{{link}}

Adres: {{adres}}`,
  },
  booking_status: {
    label: "Klient: zmiana statusu wizyty",
    subject: "Twoja wizyta: {{status}}",
    body: `Dzień dobry {{imie}},

status Twojej wizyty ({{termin}}, {{pojazd}}) zmienił się na: {{status}}.

Szczegóły rezerwacji:
{{link}}

W razie pytań zadzwoń: {{telefony}}`,
  },
  booking_cancelled: {
    label: "Klient: rezerwacja anulowana",
    subject: "Rezerwacja anulowana – {{termin}}",
    body: `Dzień dobry {{imie}},

rezerwacja na {{termin}} ({{pojazd}}) została anulowana.

Jeśli chcesz umówić nowy termin, zrób to online lub zadzwoń: {{telefony}}`,
  },
  booking_reminder: {
    label: "Klient: przypomnienie dzień przed wizytą",
    subject: "Przypomnienie: jutro wizyta w {{firma}}",
    body: `Dzień dobry {{imie}},

przypominamy o jutrzejszej wizycie.

Termin: {{termin}}
Usługi: {{uslugi}}
Pojazd: {{pojazd}}
Adres: {{adres}}

Jeśli nie możesz przyjechać, daj nam znać: {{telefony}}
{{link}}`,
  },
  workshop_new_booking: {
    label: "Warsztat: nowa rezerwacja",
    subject: "Nowa rezerwacja: {{termin}} – {{pojazd}}",
    body: `Nowa rezerwacja ({{status}}).

Klient: {{imie}}
Termin: {{termin}}
Usługi: {{uslugi}}
Pojazd: {{pojazd}}

Panel: {{link}}`,
  },
  workshop_inquiry: {
    label: "Warsztat: nowe zapytanie z formularza",
    subject: "Nowe zapytanie: {{status}}",
    body: `W skrzynce zapytań czeka nowa wiadomość ({{status}}) od: {{imie}}.

Panel: {{link}}`,
  },
  password_reset: {
    label: "Panel: reset hasła",
    subject: "Reset hasła do panelu Moto Puls",
    body: `Otrzymaliśmy prośbę o reset hasła do panelu administracyjnego.

Aby ustawić nowe hasło, otwórz link (ważny 60 minut):
{{link}}

Jeśli to nie Ty, zignoruj tę wiadomość – hasło pozostanie bez zmian.`,
  },
};

export type TemplateVars = Record<string, string>;

export function fillTemplate(template: string, vars: TemplateVars): string {
  return template.replace(/\{\{\s*([a-z_]+)\s*\}\}/g, (_, key: string) => vars[key] ?? "");
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const C = { bg: "#241E20", surface: "#2E2729", accent: "#F28524", text: "#FFFFFF", muted: "#C9C2C4" };

/**
 * Wersja HTML w barwach marki. Treść szablonu jest zwykłym tekstem – każdy fragment
 * jest escapowany, a jedynym generowanym znacznikiem z danych jest link http(s).
 */
export function renderHtml(text: string, footer: string): string {
  const paragraphs = text
    .trim()
    .split(/\n{2,}/)
    .map((block) => {
      const lines = block.split("\n").map((line) => {
        const url = line.trim();
        if (/^https?:\/\/\S+$/.test(url)) {
          const safe = escapeHtml(url);
          return `<a href="${safe}" style="display:inline-block;margin:4px 0;padding:12px 20px;background:${C.accent};color:${C.bg};font-weight:700;text-decoration:none;border-radius:6px">Otwórz</a><br><span style="font-size:12px;color:${C.muted};word-break:break-all">${safe}</span>`;
        }
        return escapeHtml(line);
      });
      return `<p style="margin:0 0 16px;line-height:1.6">${lines.join("<br>")}</p>`;
    })
    .join("");

  return `<!doctype html><html lang="pl"><head><meta charset="utf-8"><meta name="color-scheme" content="dark light"></head>
<body style="margin:0;padding:0;background:${C.bg};color:${C.text};font-family:Arial,Helvetica,sans-serif;font-size:16px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.bg}"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%">
<tr><td style="padding:8px 24px 16px;font-size:28px;font-weight:900;letter-spacing:1px;color:${C.text}">MOTO<span style="color:${C.accent}">PULS</span></td></tr>
<tr><td style="height:3px;background:${C.accent};font-size:0;line-height:0">&nbsp;</td></tr>
<tr><td style="background:${C.surface};padding:28px 24px;color:${C.text}">${paragraphs}</td></tr>
<tr><td style="padding:16px 24px;font-size:13px;line-height:1.5;color:${C.muted}">${escapeHtml(footer).replace(/\n/g, "<br>")}</td></tr>
</table></td></tr></table></body></html>`;
}
