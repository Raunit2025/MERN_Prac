import { useDispatch, useSelector } from "react-redux";
import { CREDIT_PACKS, PLAN_IDS, pricingList } from "../../config/payments";
import { useState, useEffect } from "react";
import axios from "axios";
import { serverEndpoint } from "../../config/config";
import { SET_USER } from "../../redux/user/actions";

function PurchaseCredit() {
  const dispatch = useDispatch();
  const userDetails = useSelector((state) => state.userDetails);
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [razorpayLoaded, setRazorpayLoaded] = useState(false); // New state to track SDK loading

  useEffect(() => {
    // Function to load the Razorpay script
    const loadRazorpayScript = () => {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => {
        setRazorpayLoaded(true); // Set to true once the script is loaded
      };
      script.onerror = () => {
        setErrors({ message: "Failed to load Razorpay SDK. Please try again." });
      };
      document.body.appendChild(script);
    };

    // Load the script if it's not already loaded
    if (!window.Razorpay && !razorpayLoaded) {
      loadRazorpayScript();
    } else if (window.Razorpay) {
      setRazorpayLoaded(true); // If already available, set flag to true
    }
  }, [razorpayLoaded]);

  const handleBuyCredits = async (credits) => {
    setShowModal(false);
    setErrors({}); // Clear errors
    setMessage(null); // Clear messages

    if (!razorpayLoaded || !window.Razorpay) {
      setErrors({ message: "Razorpay SDK is not loaded. Please try again in a moment." });
      return;
    }

    try {
      const { data } = await axios.post(
        `${serverEndpoint}/payments/create-order`,
        { credits },
        { withCredentials: true }
      );

      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount: data.order.amount,
        currency: data.order.currency,
        name: "Affiliate++",
        description: `${credits} Credits Pack`,
        order_id: data.order.id,
        handler: async (response) => {
          try {
            const { data: userData } = await axios.post( // Renamed data to userData to avoid conflict
              `${serverEndpoint}/payments/verify-order`,
              {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                credits,
              },
              { withCredentials: true }
            );

            dispatch({ type: SET_USER, payload: userData.user }); // Access user from userData.user
            setMessage(`${credits} credits added!`);
          } catch (error) {
            console.error("Verify Order Error:", error); // Improved logging
            setErrors({ message: error.response?.data?.message || "Unable to purchase credits, please try again" });
          }
        },
        theme: { color: "#3399cc" },
        // Add prefill for credit purchase as well, for consistency
        prefill: {
            name: userDetails.name,
            email: userDetails.email,
            // contact: '9999999999' // Add if you collect phone number for users
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (error) {
      console.error("Create Order Error:", error); // Improved logging
      setErrors({ message: error.response?.data?.message || "Unable to purchase credits, please try again" });
    }
  };

  const handleSubscribe = async (planKey) => {
    setErrors({}); // Clear errors
    setMessage(null); // Clear messages

    if (!razorpayLoaded || !window.Razorpay) {
      setErrors({ message: "Razorpay SDK is not loaded. Please try again in a moment." });
      return;
    }

    try {
      const { data } = await axios.post(
        `${serverEndpoint}/payments/create-subscription`,
        { plan_name: planKey },
        { withCredentials: true }
      );

      const plan = PLAN_IDS[planKey];
      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID,
        name: plan.planName,
        description: plan.description,
        subscription_id: data.subscription.id,
        handler: async function (response) {
          try {
            const { data: userData } = await axios.post( // Renamed data to userData
              `${serverEndpoint}/payments/verify-subscription`,
              { subscription_id: response.razorpay_subscription_id },
              { withCredentials: true }
            );
            dispatch({ type: SET_USER, payload: userData.user });
            setMessage("Subscription activated");
          } catch (error) {
            console.error("Verify Subscription Error:", error); // Improved logging
            setErrors({ message: error.response?.data?.message || "Unable to activate subscription, please try again" });
          }
        },
        theme: { color: "#3399cc" },
        prefill: { // ADDED: prefill object with user details
            name: userDetails.name,
            email: userDetails.email,
            // contact: '9999999999' // Add if you collect phone number for users
        },
        notes: {
            address: 'Razorpay Corporate Office' // Example note, can be omitted or customized
        }
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (error) {
      console.error("Create Subscription Error:", error); // Improved logging
      setErrors({ message: error.response?.data?.message || "Failed to create subscription" });
    }
  };

  return (
    <section className="bg-white py-10 px-4">
      <div className="max-w-7xl mx-auto">
        {errors.message && (
          <div className="bg-red-100 text-red-700 px-4 py-3 rounded mb-4 border border-red-300">
            {errors.message}
          </div>
        )}
        {message && (
          <div className="bg-green-100 text-green-700 px-4 py-3 rounded mb-4 border border-green-300">
            {message}
          </div>
        )}

        <div className="flex flex-col md:flex-row justify-between mb-8">
          <div>
            <h3 className="text-3xl font-bold text-gray-800">Choose Plan</h3>
            <p className="text-gray-600 mt-2">
              Flexible options: one-time credits or recurring subscriptions.
            </p>
          </div>
          <div className="mt-4 md:mt-0 text-right">
            <h3 className="text-xl font-semibold">Current Balance</h3>
            <p className="text-gray-600 mt-1">{userDetails.credits} Credits</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {/* Credit Pack */}
          <div className="bg-gray-100 hover:bg-white hover:shadow-xl transition transform hover:-translate-y-1 rounded-lg p-6 text-center">
            <h4 className="text-xl font-semibold mb-4">Credit Packs</h4>
            <ul className="text-gray-600 text-base space-y-2 mb-4">
              {CREDIT_PACKS.map((c) => (
                <li key={c}>{c} CREDITS FOR ₹{c}</li>
              ))}
            </ul>
            <button
              className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
              onClick={() => setShowModal(true)}
            >
              Buy Credits
            </button>
          </div>

          {/* Monthly Plan */}
          <div className="bg-gray-100 hover:bg-white hover:shadow-xl transition transform hover:-translate-y-1 rounded-lg p-6 text-center">
            <h4 className="text-xl font-semibold mb-4">₹199/month</h4>
            <ul className="text-gray-600 text-base space-y-2 mb-4">
              {pricingList[1].list.map((item, i) => (
                <li key={i}>{item.detail}</li>
              ))}
            </ul>
            <button
              className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
              onClick={() => handleSubscribe("UNLIMITED_MONTHLY")}
            >
              Subscribe Monthly
            </button>
          </div>

          {/* Yearly Plan */}
          <div className="bg-gray-100 hover:bg-white hover:shadow-xl transition transform hover:-translate-y-1 rounded-lg p-6 text-center">
            <h4 className="text-xl font-semibold mb-4">₹1990/year</h4>
            <ul className="text-gray-600 text-base space-y-2 mb-4">
              {pricingList[2].list.map((item, i) => (
                <li key={i}>{item.detail}</li>
              ))}
            </ul>
            <button
              className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
              onClick={() => handleSubscribe("UNLIMITED_YEARLY")}
            >
              Subscribe Yearly
            </button>
          </div>
        </div>

        {/* Modal (custom Tailwind instead of react-bootstrap) */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Buy Credits</h2>
                <button
                  className="text-gray-500 hover:text-red-500"
                  onClick={() => setShowModal(false)}
                >
                  ✕
                </button>
              </div>
              <div className="flex flex-wrap justify-center gap-4">
                {CREDIT_PACKS.map((c) => (
                  <button
                    key={c}
                    className="bg-white border border-blue-600 text-blue-600 px-4 py-2 rounded hover:bg-blue-50"
                    onClick={() => handleBuyCredits(c)}
                  >
                    Buy {c} Credits
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

export default PurchaseCredit;