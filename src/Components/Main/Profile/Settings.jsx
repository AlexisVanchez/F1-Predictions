import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { createUserProfile, setUser, setTheme } from "../../../redux/reducer";
import Header from "../../Header/Header";

export default function Settings() {
    const user = useSelector(state => state.user.user);
    const theme = useSelector(state => state.user.theme);
    const dispatch = useDispatch();

    // Local state for form fields
    const [displayName, setDisplayName] = useState(user?.displayName || "");
    const [photoURL, setPhotoURL] = useState(user?.photoURL || "");
    const [status, setStatus] = useState(""); // "success" | "error" | ""

    const handleSave = async (e) => {
        e.preventDefault();
        setStatus("saving");

        try {
            // Update in Firestore
            await dispatch(createUserProfile({
                ...user,
                displayName: displayName,
                photoURL: photoURL
            }, {})); // Passing empty object for additionalData if not needed

            // Update in Redux
            dispatch(setUser({
                ...user,
                displayName: displayName,
                photoURL: photoURL
            }));

            setStatus("success");
            setTimeout(() => setStatus(""), 3000);
        } catch (error) {
            console.error("Error updating profile:", error);
            setStatus("error");
        }
    };

    const handleThemeToggle = () => {
        const newTheme = theme === 'dark' ? 'light' : 'dark';
        dispatch(setTheme(newTheme));
    };

    return (
        <div className={`min-h-screen flex flex-col ${theme === 'dark' ? 'bg-[#0a0b0f]' : 'bg-gray-50'}`}>
            <Header />

            <div className="flex-1 max-w-2xl mx-auto w-full p-6 mt-10">
                <div className={`rounded-2xl shadow-xl overflow-hidden border ${theme === 'dark' ? 'bg-[#13141a] border-white/10' : 'bg-white border-gray-100'}`}>
                    <div className={`p-6 border-b ${theme === 'dark' ? 'border-white/10 bg-white/5' : 'border-gray-100 bg-gray-50/50'}`}>
                        <h2 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>Account Settings</h2>
                        <p className={`text-sm mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Manage your profile and preferences</p>
                    </div>

                    <div className="p-8 space-y-8">
                        {/* Appearance Section */}
                        <div className="space-y-4">
                            <h3 className={`text-lg font-bold flex items-center ${theme === 'dark' ? 'text-gray-200' : 'text-gray-700'}`}>
                                <span className="w-1.5 h-6 bg-purple-600 rounded-full mr-3"></span>
                                Appearance
                            </h3>

                            <div className={`flex items-center justify-between p-4 rounded-lg border ${theme === 'dark' ? 'bg-white/5 border-white/10' : 'bg-gray-50 border-gray-200'}`}>
                                <div>
                                    <div className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>Theme</div>
                                    <div className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Choose your preferred color scheme</div>
                                </div>
                                <button
                                    onClick={handleThemeToggle}
                                    className={`relative inline-flex h-8 w-16 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 ${theme === 'dark' ? 'bg-gray-700' : 'bg-blue-500'
                                        }`}
                                >
                                    <span
                                        className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${theme === 'dark' ? 'translate-x-1' : 'translate-x-9'
                                            }`}
                                    />
                                    <span className={`absolute text-xs font-bold ${theme === 'dark' ? 'left-8 text-gray-300' : 'left-2 text-white'}`}>
                                        {theme === 'dark' ? '🌙' : '☀️'}
                                    </span>
                                </button>
                            </div>
                        </div>

                        <hr className={theme === 'dark' ? 'border-white/10' : 'border-gray-100'} />

                        {/* Profile Section */}
                        <form onSubmit={handleSave} className="space-y-6">
                            <h3 className={`text-lg font-bold flex items-center ${theme === 'dark' ? 'text-gray-200' : 'text-gray-700'}`}>
                                <span className="w-1.5 h-6 bg-red-600 rounded-full mr-3"></span>
                                Public Profile
                            </h3>

                            <div className="grid gap-6">
                                <div>
                                    <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Display Name</label>
                                    <input
                                        type="text"
                                        value={displayName}
                                        onChange={(e) => setDisplayName(e.target.value)}
                                        className={`w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all ${theme === 'dark' ? 'bg-white/5 border-white/10 text-white' : 'border-gray-300 text-gray-900'}`}
                                        placeholder="Enter your display name"
                                    />
                                </div>

                                <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Profile Picture</label>
                                <div className="flex items-center space-x-4">
                                    <div className="shrink-0">
                                        <img
                                            className="h-16 w-16 object-cover rounded-full border-2 border-gray-200"
                                            src={photoURL || require("../../../images/Profile_photo.jpeg")}
                                            alt="Current profile"
                                        />
                                    </div>
                                    <label className="block">
                                        <span className="sr-only">Choose profile photo</span>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={(e) => {
                                                const file = e.target.files[0];
                                                if (file) {
                                                    const reader = new FileReader();
                                                    reader.onloadend = () => {
                                                        setPhotoURL(reader.result);
                                                    };
                                                    reader.readAsDataURL(file);
                                                }
                                            }}
                                            className={`block w-full text-sm
                                                file:mr-4 file:py-2 file:px-4
                                                file:rounded-full file:border-0
                                                file:text-sm file:font-semibold
                                                file:bg-red-50 file:text-red-700
                                                hover:file:bg-red-100
                                                cursor-pointer
                                                ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}
                                              `}
                                        />
                                    </label>
                                </div>
                                <p className={`text-xs mt-2 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>Recommended: Square image, max 1MB.</p>
                            </div>

                            <button
                                type="submit"
                                disabled={status === "saving"}
                                className={`
                                    w-full py-2.5 rounded-lg font-bold text-white shadow-lg transition-all duration-300
                                    ${status === "saving" ? "bg-gray-400 cursor-not-allowed" : "bg-red-600 hover:bg-red-700 hover:shadow-red-500/30"}
                                `}
                            >
                                {status === "saving" ? "Saving..." : "Save Changes"}
                            </button>

                            {status === "success" && (
                                <div className="p-3 bg-green-50 text-green-700 rounded-lg border border-green-200 text-center animate-fade-in">
                                    Profile updated successfully!
                                </div>
                            )}
                            {status === "error" && (
                                <div className="p-3 bg-red-50 text-red-700 rounded-lg border border-red-200 text-center animate-fade-in">
                                    Error updating profile. Please try again.
                                </div>
                            )}
                        </form>

                        <hr className={theme === 'dark' ? 'border-white/10' : 'border-gray-100'} />

                        {/* Login Settings Section */}
                        <div className="space-y-4">
                            <h3 className={`text-lg font-bold flex items-center ${theme === 'dark' ? 'text-gray-200' : 'text-gray-700'}`}>
                                <span className="w-1.5 h-6 bg-blue-600 rounded-full mr-3"></span>
                                Login Details
                            </h3>

                            <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                                You are currently logged in with <strong>{user?.email}</strong>.
                            </p>

                            <a
                                href="https://myaccount.google.com/"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center text-blue-600 hover:text-blue-800 font-medium text-sm hover:underline"
                            >
                                Manage your Google Account settings
                                <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path>
                                </svg>
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
