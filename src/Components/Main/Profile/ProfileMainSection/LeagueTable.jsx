import leagues from '../../../../leagues.json'
export default function LeagueTable(){

    function getLeague(){
        return leagues.second.members
        .sort((a,b) => b.points - a.points)
        .map((user, i) => (
            <div key={user.userName} className="flex border-2 justify-between">
                <p>{i + 1}</p>
                <p>{user.userName}</p>
                <p>{user.points}</p>
            </div>
        ))
    }

    return(
        <div className="flex flex-col">
            <div className='flex justify-center font-bold'>
                <h1>{leagues.second.LeagueName} Table</h1>
            </div>
            <div>
                <div className="flex justify-around items-end">
                    <p>Name</p>
                    <p>Points</p>
                </div>
                {getLeague()}
            </div>
            
        </div>
    )
}