import React from 'react';
import useAchievements from '../../../hooks/useAchievements';
import Medal from './Medal';
import ProfileSideBar from './ProfileSideBar';
import {
    TRACK_GROUPS,
    ACH_PITSTOP_MASTER,
    ACH_CONSISTENCY,
    ACH_CHAMPION,
    ACH_POLE_KING,
    ACH_MONACO,
    CONSTRUCTOR_MEDALS
} from '../../../utils/achievementUtils';

export default function Achievements() {
    const { achievements, loading } = useAchievements();

    if (loading) {
        return (
            <div className="flex min-h-screen bg-[#0b0c10] text-gray-100">
                <ProfileSideBar />
                <div className="flex-1 flex items-center justify-center">
                    <div className="text-xl font-black italic animate-pulse text-red-500">ANALYZING ACHIEVEMENTS...</div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen bg-[#0b0c10] text-gray-100 font-inter">
            <ProfileSideBar />

            <div className="flex-1 p-8 overflow-y-auto">
                <div className="max-w-6xl mx-auto space-y-12">
                    {/* Header */}
                    <div className="relative">
                        <div className="absolute -top-10 -left-10 w-64 h-64 bg-red-600/10 blur-[100px] rounded-full"></div>
                        <h1 className="text-5xl font-black italic tracking-tighter text-white mb-2">Hall of Fame</h1>
                        <p className="text-gray-500 font-bold uppercase tracking-widest text-sm">Every milestone on your journey to F1 mastery.</p>
                    </div>

                    {/* Section: Track Mastery */}
                    <AchievementSection title="Track Mastery" description="Master different styles of circuits to prove your versatility.">
                        {Object.keys(TRACK_GROUPS).map(key => {
                            const group = TRACK_GROUPS[key];
                            const data = achievements[key];
                            return (
                                <Medal
                                    key={key}
                                    title={group.name}
                                    icon={group.icon}
                                    color={group.color}
                                    desc={data ? `${data.track}: ${data.score} pts` : group.description}
                                    isSpecial={key === 'POWER'}
                                    locked={!data}
                                />
                            );
                        })}
                    </AchievementSection>

                    {/* Section: Special Feats */}
                    <AchievementSection title="Special Feats" description="Locked achievements require consistency and deep paddock knowledge.">
                        <Medal
                            title={ACH_PITSTOP_MASTER.name}
                            icon={ACH_PITSTOP_MASTER.icon}
                            color={ACH_PITSTOP_MASTER.color}
                            desc={achievements['PITSTOP_MASTER'] ? `Streak: ${achievements['PITSTOP_MASTER'].score}` : ACH_PITSTOP_MASTER.description}
                            isSpecial
                            locked={!achievements['PITSTOP_MASTER']}
                        />
                        <Medal
                            title={ACH_CONSISTENCY.name}
                            icon={ACH_CONSISTENCY.icon}
                            color={ACH_CONSISTENCY.color}
                            desc={ACH_CONSISTENCY.description}
                            isSpecial
                            locked={!achievements['CONSISTENCY']}
                        />
                        {/* Champion Goals & History */}
                        {(() => {
                            const currentYear = new Date().getFullYear();
                            const champWins = achievements['CHAMPION'] || [];
                            const currentYearWin = champWins.find(w => w.year === currentYear);
                            const historicalWins = champWins.filter(w => w.year !== currentYear);

                            return (
                                <>
                                    {/* Show specific yearly medals for all wins */}
                                    {champWins.map(win => (
                                        <Medal
                                            key={`champ_${win.year}`}
                                            title={`Champion of the ${win.year}`}
                                            icon={ACH_CHAMPION.icon}
                                            color={ACH_CHAMPION.color}
                                            desc={win.track}
                                            isSpecial
                                        />
                                    ))}

                                    {/* Only show the generic locked target if current year isn't won yet */}
                                    {!currentYearWin && (
                                        <Medal
                                            title={ACH_CHAMPION.name}
                                            icon={ACH_CHAMPION.icon}
                                            color={ACH_CHAMPION.color}
                                            desc={ACH_CHAMPION.description}
                                            isSpecial
                                            locked
                                        />
                                    )}
                                </>
                            );
                        })()}

                        <Medal
                            title={ACH_POLE_KING.name}
                            icon={ACH_POLE_KING.icon}
                            color={ACH_POLE_KING.color}
                            desc={achievements['POLE_KING'] ? achievements['POLE_KING'].score : ACH_POLE_KING.description}
                            isSpecial
                            locked={!achievements['POLE_KING']}
                        />
                        <Medal
                            title={ACH_MONACO.name}
                            icon={ACH_MONACO.icon}
                            color={ACH_MONACO.color}
                            desc={achievements['MONACO'] ? `${achievements['MONACO'].track} - Hit` : ACH_MONACO.description}
                            isSpecial
                            locked={!achievements['MONACO']}
                        />
                    </AchievementSection>

                    {/* Section: Constructor Loyalty */}
                    <AchievementSection title="Constructor Loyalty" description="Earn medals based on which team brings you the most points.">
                        {Object.keys(CONSTRUCTOR_MEDALS).map(teamName => {
                            const medal = CONSTRUCTOR_MEDALS[teamName];
                            const isEarned = achievements['CONSTRUCTOR']?.team === teamName;
                            return (
                                <Medal
                                    key={teamName}
                                    title={medal.name}
                                    icon={medal.icon}
                                    color={medal.color}
                                    desc={isEarned ? `${teamName}: ${achievements['CONSTRUCTOR'].points} pts` : `${teamName} points leader.`}
                                    isSpecial={isEarned}
                                    locked={!isEarned}
                                />
                            );
                        })}
                    </AchievementSection>
                </div>
            </div>
        </div>
    );
}

function AchievementSection({ title, description, children }) {
    return (
        <div className="bg-white/5 rounded-[40px] p-10 border border-white/5 relative overflow-hidden group hover:border-red-600/20 transition-all duration-500">
            <div className="mb-10">
                <h3 className="text-2xl font-black italic text-red-500 uppercase tracking-tighter mb-2">{title}</h3>
                <p className="text-gray-500 text-xs font-bold uppercase tracking-widest">{description}</p>
            </div>
            <div className="flex flex-wrap gap-12">
                {children}
            </div>
        </div>
    );
}
