"use client"
import React, { useState, useEffect } from 'react'
import Image from 'next/image'
import BlurCircle from '../../components/BlurCircle'
import { Clock9Icon, HeartIcon, StarIcon } from 'lucide-react'
import timeFormat from '../../lib/timeFormat'
import toast, { Toaster } from 'react-hot-toast'
import ReactPlayer from 'react-player'
import MetaForMovieid from '@/app/components/metaForMovieid'
import { useParams } from 'next/navigation'

export default function Page() {

    const { movieid } = useParams()
    const [show, setshow] = useState(null)
    const [isfavorite, setisfavorite] = useState(false)
    const [watchLater, setwatchLater] = useState(false)
    const [director, setdirector] = useState(null)
    const [loading, setLoading] = useState(true)
    const [trailer, settrailer] = useState(null)

    useEffect(() => {
        const fetchMovieData = async () => {
            try {
                setLoading(true)

                const apiKey = process.env.NEXT_PUBLIC_TMDB_API_KEY
                if (!apiKey) {
                    throw new Error('Missing NEXT_PUBLIC_TMDB_API_KEY')
                }

                const res = await fetch(
                    `https://api.themoviedb.org/3/movie/${movieid}?api_key=${apiKey}&language=en-US&append_to_response=images,videos,credits,watch/providers&include_image_language=null,en`
                );
                const data = await res.json()

                if (!res.ok || data?.success === false) {
                    throw new Error(data?.status_message || 'Failed to load movie data')
                }

                setshow(data)
                document.title=data.title


                // Find trailer
                if (data.videos?.results?.find(v => v.site === 'YouTube' && v.type === 'Trailer')) {
                    settrailer(data.videos.results.find(v => v.site === 'YouTube' && v.type === 'Trailer'))
                } else {
                    settrailer(data.videos?.results?.find(v => v.site === 'YouTube' && v.type === 'Teaser') || null)
                }

                // Find director from crew data
                const directorData = data.credits?.crew?.find(member => member.job === "Director")
                setdirector(directorData || null)

            } catch (error) {
                toast.error(error.message || 'Failed to load movie data')
                setshow(null)
                setdirector(null)
            } finally {
                setLoading(false)
            }
        }

        if (movieid) {
            fetchMovieData()
        }
    }, [movieid])

    // Separate useEffect for user status to avoid blocking main data load
    useEffect(() => {
        const fetchUserStatus = async () => {
            try {
                // Fetch both statuses in parallel
                const [favoriteRes, watchLaterRes] = await Promise.all([
                    fetch("/api/isfavorite", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ movieid })
                    }),
                    fetch("/api/iswatchlater", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ movieid })
                    })
                ])

                const [favoriteData, watchLaterData] = await Promise.all([
                    favoriteRes.json(),
                    watchLaterRes.json()
                ])

                if (favoriteData.success) {
                    setisfavorite(true)
                }
                if (watchLaterData.success) {
                    setwatchLater(true)
                }
            } catch (error) {
                console.error('Error fetching user status:', error)
            }
        }
        
        if (movieid) {
            fetchUserStatus()
        }
    }, [movieid])

    const setWatchLater = async () => {
        const myHeaders = new Headers();
        myHeaders.append("Content-Type", "application/json");

        const raw = JSON.stringify({
            "movieid": show.id,
            "poster_path": show.poster_path,
            "title": show.title,
            "release_date": show.release_date,
            "original_language": show.original_language,
            "vote_average": show.vote_average
        });

        const requestOptions = {
            method: "POST",
            headers: myHeaders,
            body: raw,
            redirect: "follow"
        };

        const res = await fetch("/api/watchlater", requestOptions)
        const r = await res.json()

        if (r.success) {
            toast.success(r.message)
            setwatchLater(true);
        }


    }
    const removeFromWatchLater = async () => {
        const myHeaders = new Headers();
        myHeaders.append("Content-Type", "application/json");

        const raw = JSON.stringify({
            "movieid": show.id
        });

        const requestOptions = {
            method: "DELETE",
            headers: myHeaders,
            body: raw,
            redirect: "follow"
        };

        const res = await fetch("/api/watchlater", requestOptions)
        const r = await res.json()
        if (r.success) {
            toast.success(r.message)
            setwatchLater(false);

        }
    }
    const addToFavorites = async () => {
        const myHeaders = new Headers();
        myHeaders.append("Content-Type", "application/json");

        const raw = JSON.stringify({
            "movieid": show.id,
            "poster_path": show.poster_path,
            "title": show.title,
            "release_date": show.release_date,
            "original_language": show.original_language,
            "vote_average": show.vote_average
        });

        const requestOptions = {
            method: "POST",
            headers: myHeaders,
            body: raw,
            redirect: "follow"
        };

        const res = await fetch("/api/favorite", requestOptions)
        const r = await res.json()
        console.log(r.success);

        if (r.success) {
            toast.success("Added to favorites")
            setisfavorite((isfavorite) => !isfavorite);
        }

    }
    const removeFromFavorites = async () => {
        const myHeaders = new Headers();
        myHeaders.append("Content-Type", "application/json");

        const raw = JSON.stringify({
            "movieid": show.id
        });

        const requestOptions = {
            method: "DELETE",
            headers: myHeaders,
            body: raw,
            redirect: "follow"
        };

        const res = await fetch("/api/favorite", requestOptions)
        const r = await res.json()
        if (r.success) {
            toast.success("Removed from Favorites")
            setisfavorite((isfavorite) => !isfavorite);

        }
    }
    
    if (loading) {
        return (
            <div className='w-[80%] mx-auto md:mt-32 max-md:mt-16'>
                <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#f84565] mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading movie details...</p>
                </div>
            </div>
        )
    }

    if (!show) {
        return (
            <div className='w-[80%] mx-auto md:mt-32 max-md:mt-16'>
                <div className="text-center py-8">
                    <p className="text-red-600">The movie you are trying to search is not available</p>
                </div>
            </div>
        )
    }
    if (show) {


        return (
            <div className='w-[80%]  max-md:w-full max-md: max-md:ml-2 max-md:pr-2 mx-auto '>
                <Toaster />
                <MetaForMovieid movie={show} />
                <div className='flex flex-col  gap-5'>

                    <div className='flex max-md:flex-col max-md:justify-center max-md:items-center  md:gap-10'>
                        <Image
                            priority
                            src={`https://image.tmdb.org/t/p/w500${show.poster_path}`}
                            height={350}
                            width={250}
                            alt={`${show.title} poster`}
                            className='rounded-2xl border mt-5 w-[250px] mb-6 h-[350px] border-s border-[#f84565] shadow-xl shadow-white'
                        />
                        <div>

                            <h1 className='text-4xl font-bold pb-3 flex gap-5 items-center text-[#f84565] '>{show.title}
                                {show.adult && <Image src={'/-18.png'} alt='18' width={40} height={40} />}
                            </h1>
                            <h1 className='text-xl w-[600px] text-white/50 max-md:w-full'>{show.overview}</h1>
                            <div className="text-[#f84565]  flex gap-4 py-2">
                                {show.genres && show.genres.length > 0 && (
                                    <h1 className='flex gap-4'>
                                        {show.genres.map((genre) => genre.name).join('   |   ')}
                                    </h1>
                                )}
                            </div>
                            <div className='flex gap-4'>
                                <h1 className='text-xl'>{timeFormat(show.runtime)}</h1>
                                <h1 className='text-xl'>Year : {(show.release_date).split("-")[0]}</h1>
                                <div className='flex gap-2 items-center'>
                                    <div className='bg-white rounded-full w-8 flex items-center justify-center'>
                                        <StarIcon width={100} className='fill-amber-600 ' />
                                    </div>
                                    <h1>{show.vote_average.toFixed(1)}</h1>
                                </div>
                            </div>
                            <div>
                                <span>A movie by -  </span>
                                <span className='text-xl'>{director?.name || "Unknown Director"}</span>
                            </div>
                            <div className='flex gap-5 items-center mt-5'>
                                <div
                                    className='flex gap-4 bg-[#212121] hover:scale-105 w-fit px-4 py-2 rounded-2xl cursor-pointer'
                                    onClick={() => {
                                        if (watchLater === false) {
                                            setWatchLater()
                                        } else {
                                            removeFromWatchLater()
                                        }
                                    }}
                                >
                                    <h1>Watch Later</h1>
                                    <Clock9Icon className={watchLater ? "text-[#f84565]" : ""} />
                                </div>
                                <div className='rounded-full  p-1 cursor-pointer bg-[#212121] outline'
                                    onClick={() => {
                                        if (isfavorite === false) {
                                            addToFavorites()
                                        } else {
                                            removeFromFavorites()
                                        }
                                    }}
                                >
                                    <HeartIcon className={isfavorite ? "fill-[#f84565] text-[#f84565] " : ""} />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Watch Providers Section */}
                    <div>
                        <div>
                            <h1 className="text-lg text-[#f84565] font-semibold mt-4 text-center">You can watch this movie on</h1>
                        </div>
                        <div className='flex gap-5 pt-5'>
                            {!show['watch/providers']?.results?.CA?.buy?.length > 0 ? (
                                <div className='text-center text-gray-600'>No Watch Providers Available for this Movie</div>
                            ) : (
                                show['watch/providers']?.results?.CA?.buy?.slice(0, 6).map(item => (
                                    <div key={item.logo_path} className='flex flex-col gap-3'>
                                        <Image
                                            src={
                                                item.logo_path
                                                    ? `https://image.tmdb.org/t/p/w200${item.logo_path}`
                                                    : "/no-image.png"
                                            }

                                            width={100}
                                            height={100}
                                            alt='provider'
                                            className='rounded-2xl'
                                            loading="lazy"
                                        />
                                        <h1 className='text-center'>{item.provider_name}</h1>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Photos Section */}
                    <div>
                        <h1 className="text-lg font-semibold mb-4 text-[#f84565] text-center">Photos and Images from the Movie</h1>
                        {show.images?.backdrops && show.images.backdrops.length > 0 ? (
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                                {show.images.backdrops.slice(0, 15).map((item) => (
                                    <div key={item.file_path} className="relative group">
                                        <Image
                                            src={
                                                item.file_path
                                                    ? `https://image.tmdb.org/t/p/w500${item.file_path}`
                                                    : "/no-image.png"
                                            }
                                            loading="lazy"
                                            width={300}
                                            height={180}
                                            alt={`${show.title} backdrop`}
                                            className="rounded object-cover w-full h-32"
                                        />
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-8 text-gray-500">
                                <p>No images available for this movie</p>
                            </div>
                        )}
                    </div>

                    {/* Trailer Section */}
                    <div>
                        <h1 className='text-3xl font-semibold mb-4 text-[#f84565] text-center'>Watch Trailer Here</h1>
                        <div>
                            {trailer && trailer.key ? (
                                <div className='relative w-full pb-[56.25%]'>
                                    <ReactPlayer
                                        src={`https://www.youtube.com/watch?v=${trailer.key}`}
                                        controls={true}
                                        width="100%"
                                        height="100%"
                                        className="absolute top-0 left-0 w-full h-full"
                                        playing={false}
                                        muted={false}
                                        loop={false}
                                        config={{
                                            youtube: {
                                                playerVars: {
                                                    modestbranding: 1,
                                                    controls: 1,
                                                    rel: 0
                                                }
                                            }
                                        }}
                                    />
                                </div>
                            ) : (
                                <div className="text-center py-8 text-gray-500">
                                    <p>No trailer available for this movie</p>
                                </div>
                            )}
                        </div>
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold mb-2">CAST</h2>
                        <div className="flex flex-wrap gap-4 max-md:gap-2">

                            {show.credits?.cast?.slice(0, 10).map((person) => (
                                <div key={person.id} className="flex flex-col items-center w-24">
                                    <Image
                                        src={
                                            person.profile_path
                                                ? `https://image.tmdb.org/t/p/w200${person.profile_path}`
                                                : "/no-image.png"
                                        }
                                        loading="lazy"
                                        alt={person.name}
                                        width={100}
                                        height={100}
                                        className="rounded-2xl object-cover w-20 h-28 bg-gray-800"
                                    />
                                    <span className="text-xs text-white mt-1 text-center truncate w-full">{person.name}</span>
                                    <span className="text-[10px] text-gray-400 text-center truncate w-full">{person.character}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

            </div>
        )
    }
}
