const LOCALES = [
  'en','zh','es','fr','de','ja','pt','ru','ar','ko','it','nl','tr','vi','id','th',
  'hi','pl','sv','el','cs','ro','hu','fi','da','no','nb','uk','bg','hr','sr','sk',
  'sl','ms','ka','he','sw','bn','ca','fa','ur','ta','af','sq','az','hy','be','ne','si','tl','te',
];

export async function generateStaticParams() {
  return LOCALES.map(l => ({ locale: l }));
}

export default function Layout({ children }) {
  return (
    <html>
      <body>
        <main className="min-h-screen bg-[#F4F6F9]">{children}</main>
      </body>
    </html>
  );
}
