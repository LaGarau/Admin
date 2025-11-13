"use client"
import Image from "next/image";
import { useState } from "react";
import Link from "next/link";

export default function Home() {
    const [form, setForm] = useState({
    email: "",
    password: "",
  });



  // error state for backend
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (e) => {
    try {
      e.preventDefault();
      const response = await axios.post(
        "",
        form
      );
      if (response) {
        toast.success("User loggedin successfully");
      }
      console.log(form);

      /// clearing the form after the submitting the data
      setForm({
        email: "",
        password: "",
      });
      setErrorMessage(""); // clears error if previous shown

      if (response.data.success) {
       alert("Loggin Successfully")
        navigate("/dashboard");
      }
    } catch (error) {
     
      console.log("Error in logging the user", error);

      
    }
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.id]: e.target.value });
  };
  return (
    <>
    <div className=" items-center justify-center bg-gradient-to-r from-blue-100 to-blue-200 flex  h-screen">
        <div
          className="
         w-[90%] sm:w-[55%] md:w-[65%] lg:w-[30%] 
          bg-white
           p-7 md:p-10
           
            max-h-fit rounded-2xl shadow-lg"
        >
          <form onSubmit={handleSubmit} onChange={handleChange}>
            <h1 className="text-center text-[#784E9A] text-3xl font-semibold custom-font">
               Admin Login
            </h1>
            <hr className="text-blue-400  mt-4" />

            <div className="mt-4">
              <label htmlFor="email" className="font-semibold">
                Email
              </label>
              <input
                type="text"
                id="email"
                required
                placeholder="Enter your name"
                value={form.email}
                onChange={handleChange}
                className="p-2 mt-1 rounded border-none bg-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-400  focus:border-none w-full"
              />
            </div>

            <div className="mt-4">
              <label htmlFor="password" className="font-semibold">
                Password
              </label>
              <input
                type="password"
                id="password"
                required
                placeholder="Enter your name"
                value={form.password}
                onChange={handleChange}
                className="p-2 mt-1 rounded border-none bg-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-400 bor focus:border-none w-full"
              />
            </div>

            <div className="mt-6">
              <button className="bg-blue-500 text-white w-full p-2 rounded-md hover:bg-blue-600 font-semibold">
                Login
              </button>
              <span>
                Don't have an account?
                <Link href="/signup">
                  {" "}
                  <u className="text-blue-500 hover:text-blue-600">signup</u>
                </Link>
              </span>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
