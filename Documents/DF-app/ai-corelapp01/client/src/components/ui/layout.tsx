import React from 'react';
import Navigation from './navigation';

export interface LayoutProps {
  children: React.ReactNode;
  title?: string;
  showNavigation?: boolean;
}

const Layout: React.FC<LayoutProps> = ({ 
  children, 
  title = 'CorelDRAW AI Assistant',
  showNavigation = true
}) => {
  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      <header className="bg-[#2C4F9E] text-white p-4 shadow-md">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-xl font-semibold">{title}</h1>
          {showNavigation && (
            <Navigation className="bg-white text-gray-800 rounded-md shadow-sm" />
          )}
        </div>
      </header>
      
      <main className="flex-1">
        {children}
      </main>
      
      <footer className="bg-gray-100 text-gray-600 text-sm p-3 text-center border-t">
        <p>© {new Date().getFullYear()} Corel Corporation. Alle rechten voorbehouden.</p>
      </footer>
    </div>
  );
};

export default Layout; 