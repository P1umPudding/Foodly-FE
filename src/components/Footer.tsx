export function Footer() {
  return (
    <footer className="mt-24 border-t border-border/60 py-10">
      <p className="text-center text-[0.95rem] text-muted-foreground">
        © {new Date().getFullYear()} · Foodly
      </p>
    </footer>
  );
}
