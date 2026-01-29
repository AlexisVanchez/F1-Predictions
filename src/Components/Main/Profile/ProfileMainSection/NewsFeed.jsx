import news from '../../../../newsFeed.json'

export default function NewsFeed() {

    function getNews(news) {
        return news.map((item, index) => (
            <div key={index} className='group mb-6 last:mb-0'>
                <div className='p-6 bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-all duration-300 hover:border-red-100'>
                    <div className="flex justify-between items-start mb-3">
                        <span className="text-xs font-bold text-red-500 uppercase tracking-wider">F1 News</span>
                        <span className="text-xs text-gray-400">2 hours ago</span>
                    </div>
                    <h3 className='font-bold text-lg text-gray-800 mb-2 group-hover:text-red-600 transition-colors cursor-pointer'>{item.article}</h3>
                    <p className='text-gray-600 leading-relaxed text-sm'>{item.text}</p>
                    <div className="mt-4 flex items-center text-sm font-medium text-blue-600 cursor-pointer hover:underline">
                        Read more
                        <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
                        </svg>
                    </div>
                </div>
            </div>
        ))
    }

    return (
        <div className='flex flex-col w-full'>
            <div className="flex items-center justify-between mb-6">
                <h2 className='text-2xl font-bold text-gray-800 flex items-center'>
                    <span className="w-2 h-8 bg-red-600 rounded-r-full mr-4 -ml-8"></span>
                    Latest News
                </h2>
                <button className="text-sm font-semibold text-gray-500 hover:text-red-600 transition-colors">
                    View Archive
                </button>
            </div>
            <div className='space-y-2'>
                {getNews(news)}
            </div>
        </div>
    )
}