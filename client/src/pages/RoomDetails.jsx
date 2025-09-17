import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { assets, facilityIcons, roomCommonData } from '../assets/assets'
import StarRating from '../components/StarRating'
import { useAppContext } from '../context/AppContext'
import toast from 'react-hot-toast'

const RoomDetails = () => {
  const { id } = useParams()
  const { rooms, getToken, axios, navigate } = useAppContext()
  const [room, setRoom] = useState(null)
  const [mainImage, setMainImage] = useState(null)

  const [checkInDate, setCheckInDate] = useState('')
  const [checkOutDate, setCheckOutDate] = useState('')
  const [guests, setGuests] = useState(1)

  const [isAvailable, setIsAvailable] = useState(false)

  // Check room availability
  const checkAvailability = async () => {
    try {
      if (!checkInDate || !checkOutDate) {
        toast.error('Please select check-in and check-out dates')
        return
      }

      if (new Date(checkInDate) >= new Date(checkOutDate)) {
        toast.error('Check-In Date should be less than Check-Out Date')
        return
      }

      const { data } = await axios.post('/api/bookings/check-availability', {
        room: id,
        checkInDate,
        checkOutDate
      })

      if (data.success) {
        setIsAvailable(data.isAvailable)
        toast[data.isAvailable ? 'success' : 'error'](
          data.isAvailable ? 'Room is available' : 'Room is not available'
        )
      } else {
        toast.error(data.message || 'Failed to check availability')
      }
    } catch (error) {
      toast.error(error.message)
    }
  }

  // Handle booking submission
  const onSubmitHandler = async (e) => {
    e.preventDefault()
    try {
      if (!isAvailable) {
        return checkAvailability()
      }

      const { data } = await axios.post(
        '/api/bookings/book',
        {
          room: id,
          checkInDate,
          checkOutDate,
          guests,
          paymentMethod: 'Pay At Hotel'
        },
        { headers: { Authorization: `Bearer ${await getToken()}` } }
      )

      if (data.success) {
        toast.success('Booking successful!')
        navigate('/my-bookings')
        scrollTo(0, 0)
      } else {
        toast.error(data.message)
      }
    } catch (error) {
      toast.error(error.message)
    }
  }

  useEffect(() => {
    const selectedRoom = rooms.find((r) => r._id === id)
    if (selectedRoom) {
      setRoom(selectedRoom)
      setMainImage(selectedRoom.images?.[0] || assets.defaultRoom)
    }
  }, [rooms, id])

  if (!room) return <p>Loading room details...</p>

  return (
    <div className="py-28 md:py-35 px-4 md:px-16 lg:px-24 xl:px-32">
      {/* Room Details */}
      <div className="flex flex-col md:flex-row items-start md:items-center gap-2">
        <h1 className="text-3xl md:text-4xl font-playfair">
          {room.hotel?.name} <span className="font-inter text-sm">({room.roomType})</span>
        </h1>
        <p className="text-xs font-inter py-1.5 px-3 text-white bg-orange-500 rounded-full">
          20% OFF
        </p>
      </div>

      {/* Room Rating */}
      <div className="flex items-center gap-1 mt-2">
        <StarRating />
        <p className="ml-2">200+ reviews</p>
      </div>

      {/* Room Address */}
      <div className="flex items-center gap-1 text-gray-500 mt-2">
        <img src={assets.locationIcon} alt="location-icon" />
        <span>{room.hotel?.address}</span>
      </div>

      {/* Room Images */}
      <div className="flex flex-col lg:flex-row mt-6 gap-6">
        <div className="lg:w-1/2 w-full">
          <img
            src={mainImage}
            alt="Room Main"
            className="w-full rounded-xl shadow-lg object-cover"
          />
        </div>
        <div className="grid grid-cols-2 gap-4 lg:w-1/2 w-full">
          {room.images?.map((image, index) => (
            <img
              onClick={() => setMainImage(image)}
              key={index}
              src={image}
              alt="Room Thumbnail"
              className={`w-full rounded-xl shadow-md object-cover cursor-pointer ${
                mainImage === image ? 'outline outline-2 outline-orange-500' : ''
              }`}
            />
          ))}
        </div>
      </div>

      {/* Room Highlights & Price */}
      <div className="flex flex-col md:flex-row md:justify-between mt-10">
        <div className="flex flex-col">
          <h1 className="text-3xl md:text-4xl font-playfair">Experience Luxury Like Never Before</h1>
          <div className="flex flex-wrap items-center mt-3 mb-6 gap-4">
            {room.amenities?.map((item, index) => (
              <div key={index} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-100">
                <img src={facilityIcons[item]} alt={item} className="w-5 h-5" />
                <p className="text-xs">{item}</p>
              </div>
            ))}
          </div>
        </div>
        <p className="text-2xl font-medium">${room.pricePerNight}/night</p>
      </div>

      {/* Booking Form */}
      <form
        onSubmit={onSubmitHandler}
        className="flex flex-col md:flex-row items-start md:items-center justify-between bg-white shadow-[0px_0px_20px_rgba(0,0,0,0.15)] p-6 rounded-xl mx-auto mt-16 max-w-6xl"
      >
        <div className="flex flex-col flex-wrap md:flex-row items-start md:items-center gap-4 md:gap-10 text-gray-500">
          <div className="flex flex-col">
            <label htmlFor="checkInDate" className="font-medium">
              Check-In
            </label>
            <input
              onChange={(e) => setCheckInDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              type="date"
              id="checkInDate"
              className="w-full rounded border border-gray-300 px-3 py-2 mt-1.5 outline-none"
              required
            />
          </div>

          <div className="flex flex-col">
            <label htmlFor="checkOutDate" className="font-medium">
              Check-Out
            </label>
            <input
              onChange={(e) => setCheckOutDate(e.target.value)}
              min={checkInDate}
              disabled={!checkInDate}
              type="date"
              id="checkOutDate"
              className="w-full rounded border border-gray-300 px-3 py-2 mt-1.5 outline-none"
              required
            />
          </div>

          <div className="flex flex-col">
            <label htmlFor="guests" className="font-medium">
              Guests
            </label>
            <input
              onChange={(e) => setGuests(Number(e.target.value))}
              value={guests}
              type="number"
              id="guests"
              min={1}
              placeholder="1"
              className="max-w-20 rounded border border-gray-300 px-3 py-2 mt-1.5 outline-none"
              required
            />
          </div>
        </div>

        <button
          type="submit"
          className="bg-primary hover:bg-primary-dull active:scale-95 transition-all text-white rounded-md max-md:w-full max-md:mt-6 md:px-25 md:py-4 text-base cursor-pointer"
        >
          {isAvailable ? 'Book Now' : 'Check Availability'}
        </button>
      </form>
    </div>
  )
}

export default RoomDetails
