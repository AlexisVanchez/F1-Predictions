import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../config/supabase';
import { signInWithGoogle, setUser } from '../../redux/reducer_supabase';
import { useDispatch, useSelector } from 'react-redux';

export default function Login() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const dispatch = useDispatch();
  const user = useSelector((state) => state.user.user);
  const nav = useNavigate();

  useEffect(() => {
    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        console.log("User authenticated:", session.user);
        dispatch(setUser({
          uid: session.user.id,
          email: session.user.email,
          displayName: session.user.user_metadata?.full_name || session.user.user_metadata?.display_name,
          photoURL: session.user.user_metadata?.avatar_url
        }));
        nav("/home", { replace: true });
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        console.log("User authenticated status change:", session.user);
        dispatch(setUser({
          uid: session.user.id,
          email: session.user.email,
          displayName: session.user.user_metadata?.full_name || session.user.user_metadata?.display_name,
          photoURL: session.user.user_metadata?.avatar_url
        }));
        nav("/home", { replace: true });
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [dispatch, nav]);

  async function handleGoogleSignIn() {
    try {
      setLoading(true);
      setError('');
      await dispatch(signInWithGoogle());
      // Navigation will be handled by onAuthStateChanged
    } catch (error) {
      console.error("Error during Google Sign-In:", error.message);
      setError("Failed to sign in with Google. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className='min-h-screen flex justify-center items-center dynamic-bg'>
      {/* F1 Background Effects */}
      <div className='absolute inset-0 overflow-hidden opacity-10'>
        <div className='absolute top-0 left-0 w-full h-2 bg-f1-red'></div>
        <div className='absolute bottom-0 left-0 w-full h-2 bg-f1-red'></div>
      </div>

      {/* Login Card */}
      <div className='relative z-10 flex flex-col items-center justify-center f1-card p-12 w-[450px] shadow-2xl'>
        {/* F1 Logo/Title */}
        <div className='text-center mb-8'>
          <h1 className='text-5xl font-bold text-white mb-2 text-glow-red tracking-wider'>
            F1 PREDICTIONS
          </h1>
          <div className='h-1 w-24 bg-gradient-to-r from-transparent via-f1-red to-transparent mx-auto mb-4'></div>
          <p className='text-f1-light-gray text-lg'>Sign in to start predicting</p>
        </div>

        {/* Error Message */}
        {error && (
          <div className='w-full mb-6 p-4 bg-red-900/30 border border-red-500/50 rounded-lg text-red-200 text-sm'>
            {error}
          </div>
        )}

        {/* Google Sign-In Button */}
        <button
          onClick={handleGoogleSignIn}
          disabled={loading}
          className='w-full bg-white hover:bg-gray-100 text-gray-800 font-semibold py-4 px-6 rounded-lg shadow-lg transition-all duration-300 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-xl transform hover:-translate-y-1'
        >
          {loading ? (
            <div className='f1-loader'></div>
          ) : (
            <>
              <svg className='w-6 h-6' viewBox='0 0 48 48'>
                <path fill='#EA4335' d='M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z'></path>
                <path fill='#4285F4' d='M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z'></path>
                <path fill='#FBBC05' d='M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z'></path>
                <path fill='#34A853' d='M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z'></path>
                <path fill='none' d='M0 0h48v48H0z'></path>
              </svg>
              <span className='text-lg'>Sign in with Google</span>
            </>
          )}
        </button>

        {/* Additional Info */}
        <div className='mt-8 text-center'>
          <p className='text-f1-light-gray text-sm'>
            No account? Sign in with Google to get started!
          </p>
        </div>

        {/* Racing Stripe Decoration */}
        <div className='absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-f1-red via-racing-orange to-f1-red rounded-l-xl'></div>
      </div>

      {/* Floating Racing Elements */}
      <div className='absolute bottom-10 left-10 text-f1-gray opacity-20 text-8xl font-bold select-none'>
        F1
      </div>
      <div className='absolute top-10 right-10 text-f1-gray opacity-20 text-6xl font-bold select-none'>
        2024
      </div>
    </div>
  );
}