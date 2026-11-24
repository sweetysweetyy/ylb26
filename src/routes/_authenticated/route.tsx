import { createFileRoute, Outlet, redirect, useLocation } from '@tanstack/react-router';
import { VoiceOrb } from '@/components/VoiceOrb';
import { supabase } from '@/integrations/supabase/client';
// getSession reads the locally cached session (no network round-trip on every navigation); RLS still verifies the token server-side.
export const Route=createFileRoute('/_authenticated')({ssr:false,beforeLoad:async()=>{const {data}=await supabase.auth.getSession();const user=data.session?.user;if(!user)throw redirect({to:'/auth'});return {user};},component:Layout});
// Only Laboratory pages get .lab-theme; every other app renders with its own theme class.
const LAB=['/dashboard','/settings','/ideas','/history','/apps'];
function Layout(){const {pathname}=useLocation();if(!LAB.some(p=>pathname===p||pathname.startsWith(p+'/')))return <><Outlet/><VoiceOrb/></>;return <div className="lab-theme min-h-screen"><Outlet/><VoiceOrb/></div>;}
