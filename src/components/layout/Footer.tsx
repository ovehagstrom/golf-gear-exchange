import { Link } from 'react-router-dom';

export function Footer() {
  return (
    <footer className="border-t bg-muted/30">
      <div className="container py-12">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div className="space-y-4">
            <Link to="/" className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
                <span className="text-lg font-bold text-primary-foreground">G</span>
              </div>
              <span className="font-display text-xl font-semibold">GolfMarket</span>
            </Link>
            <p className="text-sm text-muted-foreground">
              Sveriges marknadsplats för begagnad golfutrustning. Trygg handel mellan golfare.
            </p>
          </div>

          {/* Categories */}
          <div>
            <h3 className="font-semibold mb-4">Kategorier</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/listings?category=driver" className="hover:text-foreground">Drivers</Link></li>
              <li><Link to="/listings?category=iron_set" className="hover:text-foreground">Järnset</Link></li>
              <li><Link to="/listings?category=wedge" className="hover:text-foreground">Wedges</Link></li>
              <li><Link to="/listings?category=putter" className="hover:text-foreground">Putters</Link></li>
              <li><Link to="/listings?category=shaft" className="hover:text-foreground">Shafts</Link></li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className="font-semibold mb-4">Support</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/help" className="hover:text-foreground">Hjälp</Link></li>
              <li><Link to="/safety" className="hover:text-foreground">Trygg handel</Link></li>
              <li><Link to="/faq" className="hover:text-foreground">Vanliga frågor</Link></li>
              <li><Link to="/contact" className="hover:text-foreground">Kontakt</Link></li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="font-semibold mb-4">Information</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/about" className="hover:text-foreground">Om oss</Link></li>
              <li><Link to="/terms" className="hover:text-foreground">Villkor</Link></li>
              <li><Link to="/privacy" className="hover:text-foreground">Integritetspolicy</Link></li>
            </ul>
          </div>
        </div>

        <div className="border-t mt-8 pt-8 text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} GolfMarket. Alla rättigheter förbehållna.</p>
        </div>
      </div>
    </footer>
  );
}