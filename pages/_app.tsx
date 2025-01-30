import '../styles/globals.css';
import type { AppProps } from 'next/app';
import { AuthProvider } from '../pages/AuthContext/AuthContext';
import { NavigationBar } from '../components/NavigationBar';

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <AuthProvider>
      <div className="flex items-center justify-center h-screen 
          bg-gradient-to-r
          from-[#020024]
          via-[#0088a3]
          to-[#090979]
          animate-[background-animate_20s_infinite]
          pt-8 pb-8 flex-col">
        <NavigationBar />
        <Component {...pageProps} />
      </div>
    </AuthProvider>
  );
}

export default MyApp;
