import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { Menu, X, Plus, MessageSquare, User, LogOut, Gavel, ShoppingBag } from 'lucide-react';
import { useState } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function Header() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
            <span className="text-lg font-bold text-primary-foreground">G</span>
          </div>
          <span className="hidden font-display text-xl font-semibold text-foreground sm:inline-block">
            GolfMarket
          </span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-6">
          <Link to="/listings" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            Alla annonser
          </Link>
          <Link to="/listings?category=driver" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            Drivers
          </Link>
          <Link to="/listings?category=iron_set" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            Järnset
          </Link>
          <Link to="/listings?category=putter" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            Putters
          </Link>
        </nav>

        {/* Desktop Actions */}
        <div className="hidden md:flex items-center gap-3">
          {user ? (
            <>
              <Button variant="outline" size="sm" asChild>
                <Link to="/messages">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Meddelanden
                </Link>
              </Button>
              <Button size="sm" asChild>
                <Link to="/listings/new">
                  <Plus className="h-4 w-4 mr-2" />
                  Sälj
                </Link>
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <User className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem asChild>
                    <Link to="/profile">Min profil</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/my-listings">Mina annonser</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/my-bids">
                      <Gavel className="h-4 w-4 mr-2" />
                      Mina bud
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/my-transactions">
                      <ShoppingBag className="h-4 w-4 mr-2" />
                      Mina affärer
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                    <LogOut className="h-4 w-4 mr-2" />
                    Logga ut
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/auth">Logga in</Link>
              </Button>
              <Button size="sm" asChild>
                <Link to="/auth?mode=signup">Registrera</Link>
              </Button>
            </>
          )}
        </div>

        {/* Mobile Menu Button */}
        <button
          className="md:hidden p-2"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t bg-background">
          <nav className="container py-4 flex flex-col gap-3">
            <Link 
              to="/listings" 
              className="py-2 text-sm font-medium"
              onClick={() => setMobileMenuOpen(false)}
            >
              Alla annonser
            </Link>
            <Link 
              to="/listings?category=driver" 
              className="py-2 text-sm font-medium"
              onClick={() => setMobileMenuOpen(false)}
            >
              Drivers
            </Link>
            <Link 
              to="/listings?category=iron_set" 
              className="py-2 text-sm font-medium"
              onClick={() => setMobileMenuOpen(false)}
            >
              Järnset
            </Link>
            <Link 
              to="/listings?category=putter" 
              className="py-2 text-sm font-medium"
              onClick={() => setMobileMenuOpen(false)}
            >
              Putters
            </Link>
            
            <div className="border-t pt-3 mt-2 flex flex-col gap-2">
              {user ? (
                <>
                  <Button variant="outline" asChild className="justify-start">
                    <Link to="/messages" onClick={() => setMobileMenuOpen(false)}>
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Meddelanden
                    </Link>
                  </Button>
                  <Button asChild className="justify-start">
                    <Link to="/listings/new" onClick={() => setMobileMenuOpen(false)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Sälj
                    </Link>
                  </Button>
                  <Button variant="ghost" asChild className="justify-start">
                    <Link to="/profile" onClick={() => setMobileMenuOpen(false)}>
                      <User className="h-4 w-4 mr-2" />
                      Min profil
                    </Link>
                  </Button>
                  <Button variant="ghost" asChild className="justify-start">
                    <Link to="/my-bids" onClick={() => setMobileMenuOpen(false)}>
                      <Gavel className="h-4 w-4 mr-2" />
                      Mina bud
                    </Link>
                  </Button>
                  <Button variant="ghost" asChild className="justify-start">
                    <Link to="/my-transactions" onClick={() => setMobileMenuOpen(false)}>
                      <ShoppingBag className="h-4 w-4 mr-2" />
                      Mina affärer
                    </Link>
                  </Button>
                  <Button 
                    variant="ghost" 
                    className="justify-start text-destructive"
                    onClick={() => {
                      handleSignOut();
                      setMobileMenuOpen(false);
                    }}
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Logga ut
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="outline" asChild>
                    <Link to="/auth" onClick={() => setMobileMenuOpen(false)}>
                      Logga in
                    </Link>
                  </Button>
                  <Button asChild>
                    <Link to="/auth?mode=signup" onClick={() => setMobileMenuOpen(false)}>
                      Registrera
                    </Link>
                  </Button>
                </>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}