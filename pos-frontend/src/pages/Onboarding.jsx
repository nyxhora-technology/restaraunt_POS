import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useMutation, useQuery } from "@tanstack/react-query";
import { enqueueSnackbar } from "notistack";
import { getErrorMessage, getMyRestaurant, registerRestaurant } from "../https";
import { setRestaurant, setUser } from "../redux/slices/userSlice";
import { useNavigate } from "react-router-dom";

const fields = [
  ["name", "Restaurant Name"],
  ["address", "Address"],
  ["city", "City"],
  ["phone", "Restaurant Phone"],
  ["email", "Restaurant Email"],
];

const Onboarding = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useSelector((state) => state.user);
  const { email, restaurant } = user;
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    city: "",
    phone: "",
    email: email || "",
    description: "",
    currency: "INR",
  });

  useEffect(() => {
    document.title = "POS | Restaurant Setup";
  }, []);
  useEffect(() => {
    if (restaurant?.status === "APPROVED") navigate("/");
  }, [navigate, restaurant?.status]);
  const statusQuery = useQuery({
    queryKey: ["my-restaurant-status"],
    queryFn: getMyRestaurant,
    enabled: Boolean(restaurant),
  });
  useEffect(() => {
    const latest = statusQuery.data?.data.data;
    if (!latest) return;
    dispatch(setRestaurant(latest));
    if (latest.status === "APPROVED") navigate("/");
  }, [dispatch, navigate, statusQuery.data]);

  const mutation = useMutation({
    mutationFn: registerRestaurant,
    onSuccess: ({ data }) => {
      dispatch(setRestaurant(data.data));
      dispatch(setUser({ ...user, role: "OWNER", restaurantId: data.data.id }));
      enqueueSnackbar(data.message, { variant: "success" });
    },
    onError: (error) =>
      enqueueSnackbar(getErrorMessage(error, "Restaurant registration failed"), {
        variant: "error",
      }),
  });

  if (restaurant) {
    const statusText = {
      PENDING: "Your restaurant application is waiting for platform approval.",
      REJECTED: restaurant.rejectionReason
        ? `Application rejected: ${restaurant.rejectionReason}`
        : "Your restaurant application was rejected.",
      SUSPENDED: "This restaurant is suspended. Contact the platform administrator.",
    };
    return (
      <section className="dashboard-shell h-[calc(100vh-5rem)] flex items-center justify-center bg-[var(--dash-bg)]">
        <div className="dashboard-panel p-10 rounded-xl w-[560px] text-center shadow-[var(--dash-shadow)]">
          <h1 className="text-[var(--dash-primary-strong)] text-3xl font-semibold mb-4">{restaurant.name}</h1>
          <p className="text-[var(--dash-muted)] text-base mb-2">
            {statusText[restaurant.status] || `Restaurant status: ${restaurant.status}`}
          </p>
          <p className="text-[var(--dash-text)] text-lg font-bold">{restaurant.status}</p>
        </div>
      </section>
    );
  }

  return (
      <section className="dashboard-shell min-h-[calc(100vh-5rem)] flex items-center justify-center py-10 bg-[var(--dash-bg)]">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            mutation.mutate(formData);
          }}
          className="dashboard-panel p-8 rounded-xl w-[620px] shadow-[var(--dash-shadow)]"
        >
          <h1 className="text-[var(--dash-text)] text-3xl font-bold text-center mb-8">
            Complete Restaurant Setup
          </h1>
          <div className="grid grid-cols-2 gap-5">
            {fields.map(([name, label]) => (
              <label key={name} className="dashboard-modal-label">
                {label}
                <div className="dashboard-modal-field mt-1.5">
                  <input
                    name={name}
                    value={formData[name]}
                    onChange={(event) =>
                      setFormData((current) => ({ ...current, [name]: event.target.value }))
                    }
                    type={name === "email" ? "email" : "text"}
                    className="dashboard-modal-input w-full"
                    required
                  />
                </div>
              </label>
            ))}
            <label className="dashboard-modal-label">
              Currency
              <div className="dashboard-modal-field mt-1.5">
                <select
                  name="currency"
                  value={formData.currency}
                  onChange={(event) =>
                    setFormData((current) => ({ ...current, currency: event.target.value }))
                  }
                  className="bg-transparent text-[var(--dash-text)] outline-none border-none w-full cursor-pointer"
                  required
                >
                  <option value="INR">₹ (INR) - India</option>
                  <option value="USD">$ (USD) - United States</option>
                  <option value="EUR">€ (EUR) - Europe</option>
                  <option value="GBP">£ (GBP) - United Kingdom</option>
                  <option value="AUD">$ (AUD) - Australia</option>
                </select>
              </div>
            </label>
          </div>
          <label className="dashboard-modal-label mt-5 block">
            Description
            <div className="dashboard-modal-field mt-1.5 h-auto items-start py-2">
              <textarea
                value={formData.description}
                onChange={(event) =>
                  setFormData((current) => ({ ...current, description: event.target.value }))
                }
                className="dashboard-modal-input w-full min-h-[80px] resize-y"
                rows="3"
              />
            </div>
          </label>
          <button
            type="submit"
            disabled={mutation.isPending}
            className="dashboard-primary-button w-full mt-8 py-3.5 text-[15px]"
          >
            {mutation.isPending ? "Submitting..." : "Submit for Approval"}
          </button>
        </form>
      </section>
  );
};

export default Onboarding;
