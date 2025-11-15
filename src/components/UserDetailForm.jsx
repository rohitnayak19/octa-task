import React, { useEffect, useState } from "react";
import { db } from "../firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "react-hot-toast";

function UserDetailsForm({ userId, role, onClose, basicInfo }) {
  const [formData, setFormData] = useState({
    address: "",
    department: "",
    roleLevel: "",
    salary: "",
    bankName: "",
    accountNumber: "",
    ifscCode: "",
    joinDate: "",
    aadharUrl: "",
    gstNumber: "",
  });

  const departments = [
    "IT Department",
    "Social Media",
    "Graphic Design",
    "Amazon / Flipkart",
    "Digital Marketing",
    "Finance",
    "Sales Manager"
  ];

  const roleLevels = ["Internship", "Junior", "Senior"];
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // const handleFileUpload = async (e) => {
  //   const file = e.target.files[0];
  //   if (!file) return;

  //   const storage = getStorage();
  //   const storageRef = ref(storage, `aadhar/${userId}/${file.name}`);

  //   const uploadTask = uploadBytesResumable(storageRef, file);

  //   setUploading(true);
  //   setUploadProgress(0);

  //   uploadTask.on(
  //     "state_changed",
  //     (snapshot) => {
  //       const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
  //       setUploadProgress(Math.floor(progress));
  //     },
  //     (error) => {
  //       console.error("Upload error:", error);
  //       toast.error("Upload failed. Try again.");
  //       setUploading(false);
  //     },
  //     async () => {
  //       const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
  //       setFormData((prev) => ({ ...prev, aadharUrl: downloadURL }));
  //       toast.success("File uploaded successfully!");
  //       setUploading(false);
  //     }
  //   );
  // };

  // 🔹 Load existing user details (auto-fill form)
  useEffect(() => {
    const fetchUserDetails = async () => {
      if (!userId) return;
      try {
        const userRef = doc(db, "users", userId);
        const snap = await getDoc(userRef);
        if (snap.exists()) {
          const data = snap.data();
          setFormData((prev) => ({
            ...prev,
            address: data.address || "",
            department: data.department || "",
            roleLevel: data.roleLevel || "",
            salary: data.salary || "",
            bankName: data.bankName || "",
            accountNumber: data.accountNumber || "",
            ifscCode: data.ifscCode || "",
            joinDate: data.joinDate || "",
            aadharUrl: data.aadharUrl || "",
            gstNumber: data.gstNumber || "",
          }));
        }
      } catch (err) {
        console.error("Error fetching user details:", err);
      }
    };

    fetchUserDetails();
  }, [userId]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSave = async () => {
    try {
      const userRef = doc(db, "users", userId);

      const dataToSave =
        role === "user"
          ? {
            address: formData.address,
            department: formData.department,
            roleLevel: formData.roleLevel,
            salary: formData.salary,
            bankName: formData.bankName,
            accountNumber: formData.accountNumber,
            ifscCode: formData.ifscCode,
            joinDate: formData.joinDate,
            aadharUrl: formData.aadharUrl,
          }
          : {
            bankName: formData.bankName,
            accountNumber: formData.accountNumber,
            ifscCode: formData.ifscCode,
            gstNumber: formData.gstNumber,
            aadharUrl: formData.aadharUrl,
          };

      await updateDoc(userRef, dataToSave);
      toast.success("User details saved successfully!");
      onClose && onClose();
    } catch (error) {
      console.error("Error saving details:", error);
      toast.error("Failed to save details.");
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("File must be under 5MB");
      return;
    }

    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "application/pdf"];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Only JPG, PNG or PDF allowed");
      return;
    }
    
    const formDataCloud = new FormData();
    formDataCloud.append("file", file);
    formDataCloud.append("upload_preset", "octataskdoc"); // your preset
    formDataCloud.append("folder", "octadoc"); // optional but good

    try {
      setUploading(true);
      setUploadProgress(30); // fake initial progress

      const res = await fetch(
        "https://api.cloudinary.com/v1_1/dcoladnif/upload",
        {
          method: "POST",
          body: formDataCloud,
        }
      );

      const data = await res.json();

      setUploadProgress(100);
      setFormData((prev) => ({ ...prev, aadharUrl: data.secure_url }));

      toast.success("Aadhar uploaded successfully!");
    } catch (error) {
      console.error("Upload Error:", error);
      toast.error("Upload failed. Try again.");
    } finally {
      setUploading(false);
    }
  };


  return (
    <div className="space-y-6">
      {/* 🧾 User Basic Info Card */}
      {basicInfo && (
        <div className="bg-gray-50 border border-gray-200 p-4 rounded-xl shadow-sm">
          <h3 className="text-base font-semibold text-gray-800 mb-3">User Summary</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-sm text-gray-700">
            <p>
              <span className="font-medium text-gray-600">Name:</span> {basicInfo.name}
            </p>
            <p>
              <span className="font-medium text-gray-600">Email:</span> {basicInfo.email}
            </p>
            <p>
              <span className="font-medium text-gray-600">Role:</span>{" "}
              {basicInfo.role === "user" ? "Manager" : "Client"}
            </p>
            <p>
              <span className="font-medium text-gray-600">Status:</span>{" "}
              <span
                className={`capitalize font-semibold ${basicInfo.status === "approved"
                  ? "text-green-700"
                  : basicInfo.status === "pending"
                    ? "text-yellow-700"
                    : "text-gray-600"
                  }`}
              >
                {basicInfo.status}
              </span>
            </p>
          </div>
        </div>
      )}

      {/* 🏢 Manager Fields */}
      {role === "user" ? (
        <>
          <h3 className="text-base font-semibold text-gray-800 border-b pb-1">
            Employment Details
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <Label>Address</Label>
              <Input
                name="address"
                value={formData.address}
                onChange={handleChange}
                placeholder="Enter address"
                className="mt-1"
              />
            </div>

            <div>
              <Label>Department</Label>
              <Select
                value={formData.department}
                onValueChange={(val) => setFormData({ ...formData, department: val })}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((dep) => (
                    <SelectItem key={dep} value={dep}>
                      {dep}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Role Level</Label>
              <Select
                value={formData.roleLevel}
                onValueChange={(val) => setFormData({ ...formData, roleLevel: val })}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select level" />
                </SelectTrigger>
                <SelectContent>
                  {roleLevels.map((lvl) => (
                    <SelectItem key={lvl} value={lvl}>
                      {lvl}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Salary or Stipend</Label>
              <Input
                name="salary"
                value={formData.salary}
                onChange={handleChange}
                placeholder="Enter salary (₹)"
                className="mt-1"
              />
            </div>
          </div>

          {/* 💳 Bank Section */}
          <h3 className="text-base font-semibold text-gray-800 border-b pb-1 mt-6">
            Bank Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <Label>Bank Name</Label>
              <Input
                name="bankName"
                value={formData.bankName}
                onChange={handleChange}
                placeholder="Bank name"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Account Number</Label>
              <Input
                name="accountNumber"
                value={formData.accountNumber}
                onChange={handleChange}
                placeholder="Account number"
                className="mt-1"
              />
            </div>
            <div>
              <Label>IFSC Code</Label>
              <Input
                name="ifscCode"
                value={formData.ifscCode}
                onChange={handleChange}
                placeholder="IFSC code"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Join Date</Label>
              <Input
                type="date"
                name="joinDate"
                value={formData.joinDate}
                onChange={handleChange}
                className="mt-1"
              />
            </div>
          </div>

          {/* 🪪 ID Section */}
          <h3 className="text-base font-semibold text-gray-800 border-b pb-1 mt-6">
            ID Proof
          </h3>
          <div>
            {/* 🪪 ID Proof Upload */}
            <h3 className="text-base font-semibold text-gray-800 border-b pb-1 mt-6">
              ID Proof
            </h3>

            <div className="space-y-2">
              <Label>Aadhar Upload</Label>

              <input
                type="file"
                accept=".jpg,.jpeg,.png,.pdf"
                onChange={handleFileUpload}
                className="w-full text-sm border rounded-md cursor-pointer bg-gray-50 p-2 file:mr-4 file:py-2 file:px-4 
 file:rounded-md file:border-0 file:text-sm file:font-semibold 
 file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
              {uploading && (
                <div className="text-xs text-gray-600">
                  Uploading: {uploadProgress}% done...
                </div>
              )}


              {formData.aadharUrl && (
                <div className="text-xs text-green-700 mt-1">
                  File uploaded successfully!
                  <a
                    href={formData.aadharUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="underline text-blue-600 ml-1"
                  >
                    View File
                  </a>
                </div>
              )}

            </div>

          </div>
        </>
      ) : (
        <>
          <h3 className="text-base font-semibold text-gray-800 border-b pb-1">
            Client Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <Label>Bank Name</Label>
              <Input
                name="bankName"
                value={formData.bankName}
                onChange={handleChange}
                placeholder="Bank name"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Account Number</Label>
              <Input
                name="accountNumber"
                value={formData.accountNumber}
                onChange={handleChange}
                placeholder="Account number"
                className="mt-1"
              />
            </div>
            <div>
              <Label>IFSC Code</Label>
              <Input
                name="ifscCode"
                value={formData.ifscCode}
                onChange={handleChange}
                placeholder="IFSC code"
                className="mt-1"
              />
            </div>
            <div>
              <Label>GST Number</Label>
              <Input
                name="gstNumber"
                value={formData.gstNumber}
                onChange={handleChange}
                placeholder="Enter GST number"
                className="mt-1"
              />
            </div>
            <div className="md:col-span-2">
              {/* 🪪 ID Proof Upload */}
              <h3 className="text-base font-semibold text-gray-800 border-b pb-1 mt-6">
                ID Proof
              </h3>

              <div className="space-y-2">
                <Label>Aadhar Upload</Label>

                <input
                  type="file"
                  accept=".jpg,.jpeg,.png,.pdf"
                  onChange={handleFileUpload}
                  className="w-full text-sm border rounded-md cursor-pointer bg-gray-50 p-2 file:mr-4 file:py-2 file:px-4 
               file:rounded-md file:border-0 file:text-sm file:font-semibold 
               file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />

                {uploading && (
                  <div className="text-xs text-gray-600">
                    Uploading: {uploadProgress}% done...
                  </div>
                )}

                {formData.aadharUrl && (
                  <div className="text-xs text-green-700 mt-1">
                    ✅ File uploaded successfully!{" "}
                    <a
                      href={formData.aadharUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="underline text-blue-600 ml-1"
                    >
                      View File
                    </a>
                  </div>
                )}
              </div>

            </div>
          </div>
        </>
      )}

      {/* 🔘 Buttons */}
      <div className="pt-6 flex justify-end gap-3 border-t mt-8">
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          className="bg-zinc-600 hover:bg-zinc-700 text-white shadow-md px-6 cursor-pointer"
        >
          Save Details
        </Button>
      </div>
    </div>
  );

}

export default UserDetailsForm;
