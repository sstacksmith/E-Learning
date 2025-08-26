import { NotFound } from '@/components/NotFound';

export default function NotFoundPage() {
  return (
    <NotFound 
      title="404 - Strona nie istnieje"
      message="Strona której szukasz nie istnieje lub została przeniesiona. Sprawdź adres URL lub użyj wyszukiwarki aby znaleźć to czego szukasz."
      showSearch={true}
      showSuggestions={true}
      primaryAction={{
        label: "Przejdź do platformy",
        href: "/homelogin",
        icon: null
      }}
    />
  );
}

