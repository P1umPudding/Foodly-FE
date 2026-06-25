export function Footer() {
  return (
    <footer className="px-6 pb-2 pt-10">
      <p className="text-center text-xs text-muted-foreground/60">
        © {new Date().getFullYear()} · Foodly
      </p>
    </footer>
  );
}
