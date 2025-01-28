import React from 'react';

interface AddProductFormProps {
  formData: { name: string; description: string; image?: File | null };
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  loading: boolean;
  account: string;
  isStorachaLoggedIn: boolean;
}

const AddProductForm: React.FC<AddProductFormProps> = ({
  formData,
  handleInputChange,
  handleFileChange,
  handleSubmit,
  loading,
  account,
  isStorachaLoggedIn,
}) => {
  return (
    <div className="bg-white p-6 rounded-lg">
      <h2 className="text-xl font-semibold mb-4">Add New Product</h2>
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label className="block text-gray-700 mb-2">Product Name</label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border rounded"
            required
          />
        </div>
        <div className="mb-4">
          <label className="block text-gray-700 mb-2">Description</label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border rounded"
            rows={3}
            required
          />
        </div>
        <div className="mb-4">
          <label className="block text-gray-700 mb-2">Image (Optional)</label>
          <input
            type="file"
            onChange={handleFileChange}
            accept="image/*"
            className="w-full"
          />
        </div>
        <button
          type="submit"
          disabled={loading || !account || !isStorachaLoggedIn}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:bg-gray-400"
        >
          {loading ? 'Adding...' : 'Add Product'}
        </button>
      </form>
    </div>
  );
};

export default AddProductForm;
