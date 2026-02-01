import React, { useState, useEffect } from "react";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { Badge } from "../ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Edit, Trash2, RefreshCw, Search, X, Scissors } from "lucide-react";
import { fetchApi } from "../../lib/api";
import Cropper from "react-easy-crop";
import { getCroppedImgFile } from "../../utils/cropImage";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../ui/dialog";

const AllProductsList = () => {
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");

  const [editing, setEditing] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [editDragActive, setEditDragActive] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  // Cropping State for edit
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [imageToCrop, setImageToCrop] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [currentFileToCrop, setCurrentFileToCrop] = useState(null);

  // Predefined categories
  const categories = [
    "All",
    "Necklace",
    "Bracelet",
    "Earrings",
    "Rings",
    "Hamper",
    "Pendants",
    "Scrunchies",
    "Claws",
    "Hairbows",
    "Hairclips",
    "Studs",
    "Jhumka",
    "Custom Packaging",
    "Bouquet",
    "Chocolate Tower",
    "Jhumka Box",
    "Men's Hamper",
  ];

  // Fetch products
  const fetchProducts = async () => {
    setLoading(true);
    try {
      const data = await fetchApi("/api/products");
      setProducts(Array.isArray(data) ? data : []);
      setFilteredProducts(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Fetch products error", err);
      setMessage(
        "Error fetching products: " + (err.message || "Unknown error")
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  // Filter products based on search and category
  useEffect(() => {
    let filtered = products;

    // Filter by category
    if (categoryFilter !== "All") {
      filtered = filtered.filter(p => p.category === categoryFilter);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(query) ||
        p.description.toLowerCase().includes(query) ||
        p.category.toLowerCase().includes(query)
      );
    }

    setFilteredProducts(filtered);
  }, [searchQuery, categoryFilter, products]);

  const handleEditDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setEditDragActive(true);
    } else if (e.type === "dragleave") {
      setEditDragActive(false);
    }
  };

  const onCropComplete = (croppedArea, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  };

  const applyCrop = async () => {
    try {
      const croppedFile = await getCroppedImgFile(
        imageToCrop,
        croppedAreaPixels,
        currentFileToCrop.name
      );
      
      const preview = {
        url: URL.createObjectURL(croppedFile),
        type: "image",
        file: croppedFile
      };

      setEditForm((f) => ({ ...f, newMediaFiles: [...(f.newMediaFiles || []), preview] }));
      
      setCropModalOpen(false);
      setImageToCrop(null);
      setCurrentFileToCrop(null);
      setMessage("Image cropped successfully");
    } catch (e) {
      console.error(e);
      setMessage("Error cropping image");
    }
  };

  const handleEditDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setEditDragActive(false);

    const files = Array.from(e.dataTransfer.files);
    const mediaFiles = files.filter(file => file.type.startsWith("image/") || file.type.startsWith("video/"));
    
    if (mediaFiles.length === 0) {
      setMessage("Please upload image or video files");
      return;
    }

    if (mediaFiles.length === 1 && mediaFiles[0].type.startsWith("image/")) {
      setImageToCrop(URL.createObjectURL(mediaFiles[0]));
      setCurrentFileToCrop(mediaFiles[0]);
      setCropModalOpen(true);
    } else {
      const previews = mediaFiles.map(file => ({
        url: URL.createObjectURL(file),
        type: file.type.startsWith("video/") ? "video" : "image",
        file
      }));
      setEditForm((f) => ({ ...f, newMediaFiles: [...(f.newMediaFiles || []), ...previews] }));
    }
  };

  const handleEditFileChange = (e) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      const mediaFiles = files.filter(file => file.type.startsWith("image/") || file.type.startsWith("video/"));
      
      if (mediaFiles.length === 0) {
        setMessage("Please upload image or video files");
        return;
      }

      if (mediaFiles.length === 1 && mediaFiles[0].type.startsWith("image/")) {
        setImageToCrop(URL.createObjectURL(mediaFiles[0]));
        setCurrentFileToCrop(mediaFiles[0]);
        setCropModalOpen(true);
      } else {
        const previews = mediaFiles.map(file => ({
          url: URL.createObjectURL(file),
          type: file.type.startsWith("video/") ? "video" : "image",
          file
        }));
        setEditForm((f) => ({ ...f, newMediaFiles: [...(f.newMediaFiles || []), ...previews] }));
      }
    }
  };

  // Handle edit product
  const handleEdit = async (e) => {
    e.preventDefault();
    if (!editing) return;
    setLoading(true);
    setMessage("");

    try {
      if (!editForm.name) throw new Error("Name is required");
      if (!editForm.originalPrice) throw new Error("Original price is required");
      if (!editForm.category) throw new Error("Category is required");

      const originalPrice = parseFloat(editForm.originalPrice);
      const discountedPrice = editForm.discountedPrice
        ? parseFloat(editForm.discountedPrice)
        : originalPrice;

      if (isNaN(originalPrice))
        throw new Error("Original price must be a valid number");
      if (editForm.discountedPrice && isNaN(discountedPrice))
        throw new Error("Discounted price must be a valid number");

      const formData = new FormData();
      formData.append("name", editForm.name.trim());
      formData.append("originalPrice", originalPrice);
      formData.append("discountedPrice", discountedPrice);
      formData.append(
        "description",
        editForm.description
          ? editForm.description.trim()
          : `${editForm.name.trim()} - A beautiful piece from our collection`
      );
      formData.append("category", editForm.category.trim());
      formData.append("rating", Number(editForm.rating) || 4.5);
      formData.append("quantity", parseInt(editForm.quantity) || 0);

      const existingMedia = editForm.media || [];
      formData.append("media", JSON.stringify(existingMedia));

      if (editForm.newMediaFiles) {
        editForm.newMediaFiles.forEach(m => {
          formData.append("media", m.file);
        });
      }

      const adminToken = localStorage.getItem("adminToken");

      const response = await fetchApi(`/api/products/${editing}`, {
        method: "PUT",
        headers: {
          "x-admin-token": adminToken,
        },
        body: formData,
      });

      if (editForm.newMediaFiles) {
        editForm.newMediaFiles.forEach(m => {
          if (m.url) URL.revokeObjectURL(m.url);
        });
      }

      setEditing(null);
      setEditForm({});
      setMessage("Product updated successfully!");
      fetchProducts();
    } catch (err) {
      console.error("Edit product error:", err);
      let errorMessage = "Failed to update product";
      if (err instanceof Error) {
        errorMessage = err.message;
      } else if (typeof err === "object" && err !== null) {
        errorMessage = JSON.stringify(err);
      } else if (typeof err === "string") {
        errorMessage = err;
      }
      setMessage("Error: " + errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Handle delete product
  const handleDelete = async (id) => {
    if (!id) return;
    setLoading(true);
    setMessage("");

    try {
      const adminToken = localStorage.getItem("adminToken");

      const response = await fetchApi(`/api/products/${id}`, {
        method: "DELETE",
        headers: {
          "x-admin-token": adminToken,
        },
      });

      setDeleteId(null);
      setMessage("Product deleted successfully!");
      fetchProducts();
    } catch (err) {
      console.error("Delete product error:", err);
      let errorMessage = "Failed to delete product";
      if (err instanceof Error) {
        errorMessage = err.message;
      } else if (typeof err === "object" && err !== null) {
        errorMessage = JSON.stringify(err);
      } else if (typeof err === "string") {
        errorMessage = err;
      }
      setMessage("Error: " + errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <h3 className="font-semibold text-lg">All Products ({filteredProducts.length})</h3>
          <Button variant="outline" onClick={fetchProducts} disabled={loading}>
            <RefreshCw
              className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
        </div>

        {/* Search and Filter Bar */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search products by name, description, or category..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-10"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by category" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((category) => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {message && (
          <div
            className={`mb-4 p-2 rounded text-sm ${
              message.includes("successfully")
                ? "bg-green-100 text-green-800"
                : "bg-red-100 text-red-800"
            }`}
          >
            {message}
          </div>
        )}

        {loading && products.length === 0 ? (
          <div className="text-center py-8">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto text-gray-400" />
            <p className="mt-2 text-gray-500">Loading products...</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">No products found</p>
            {(searchQuery || categoryFilter !== "All") && (
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => {
                  setSearchQuery("");
                  setCategoryFilter("All");
                }}
              >
                Clear Filters
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-4">Product</th>
                  <th className="text-left p-4">Category</th>
                  <th className="text-left p-4">Price</th>
                  <th className="text-left p-4">Stock</th>
                  <th className="text-left p-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((product) => (
                  <tr
                    key={product.id || product._id}
                    className="border-b hover:bg-gray-50"
                  >
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <img
                            src={(() => {
                              if (Array.isArray(product.media) && product.media.length > 0) {
                                const firstM = product.media[0];
                                return typeof firstM === 'string' ? firstM : firstM.url;
                              }
                              return product.image || product.imageUrl || product.img || "/images/placeholder.svg";
                            })()}
                            alt={product.name}
                            className="w-12 h-12 object-cover rounded"
                            onError={(e) => {
                              e.target.src = "https://placehold.co/100x100?text=No+Image";
                            }}
                          />
                          {product.media && product.media.length > 1 && (
                            <Badge className="absolute -top-2 -right-1 text-[10px] px-1 h-4 min-w-4 justify-center" variant="secondary">
                              +{product.media.length - 1}
                            </Badge>
                          )}
                        </div>
                        <div>
                          <div className="font-medium">{product.name}</div>
                          <div className="text-sm text-gray-500">
                            {product.description.substring(0, 50)}...
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <Badge variant="secondary">{product.category}</Badge>
                    </td>
                    <td className="p-4">
                      <div className="font-medium">
                        ₹{(Number(product.discountedPrice) || 0).toFixed(2)}
                      </div>
                      <div className="text-sm text-gray-500 line-through">
                        ₹{(Number(product.originalPrice) || 0).toFixed(2)}
                      </div>
                    </td>
                    <td className="p-4">
                      {Number(product.quantity) <= 0 && <Badge variant="destructive">Sold Out</Badge>}
                      {Number(product.quantity) > 0 && Number(product.quantity) <= 5 && (
                        <Badge variant="warning">Low ({product.quantity})</Badge>
                      )}
                      {Number(product.quantity) > 5 && (
                        <span className="text-sm">{product.quantity} in stock</span>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditing(product.id || product._id);
                            setEditForm({
                              name: product.name,
                              originalPrice: product.originalPrice,
                              discountedPrice: product.discountedPrice,
                              media: product.media,
                              image: product.image,
                              description: product.description,
                              category: product.category,
                              quantity: product.quantity,
                              rating: product.rating || 4.5,
                            });
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => setDeleteId(product.id || product._id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Edit Product Dialog */}
      {editing && (
        <Dialog open={!!editing} onOpenChange={() => setEditing(null)}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Product</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleEdit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Product Name</label>
                <Input
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Original Price (₹)</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={editForm.originalPrice}
                    onChange={(e) => setEditForm({ ...editForm, originalPrice: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Discounted Price (₹)</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={editForm.discountedPrice}
                    onChange={(e) => setEditForm({ ...editForm, discountedPrice: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Quantity</label>
                  <Input
                    type="number"
                    value={editForm.quantity}
                    onChange={(e) => setEditForm({ ...editForm, quantity: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Category</label>
                  <Select
                    value={editForm.category}
                    onValueChange={(value) => setEditForm({ ...editForm, category: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.filter(c => c !== "All").map((category) => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <Textarea
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  rows={3}
                />
              </div>

              {/* Existing Media */}
              {editForm.media && editForm.media.length > 0 && (
                <div>
                  <label className="block text-sm font-medium mb-2">Current Media</label>
                  <div className="flex flex-wrap gap-2">
                    {editForm.media.map((m, i) => (
                      <div key={i} className="relative w-20 h-20">
                        {(typeof m === 'object' && m.type === "video") ? (
                          <div className="w-full h-full bg-black rounded flex items-center justify-center text-white text-[8px]">VIDEO</div>
                        ) : (
                          <img
                            src={typeof m === 'string' ? m : m.url}
                            className="w-full h-full object-cover rounded"
                          />
                        )}
                        <button
                          type="button"
                          className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-1"
                          onClick={() => {
                            const updated = [...editForm.media];
                            updated.splice(i, 1);
                            setEditForm({ ...editForm, media: updated });
                          }}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* New Media Upload */}
              <div
                className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors cursor-pointer ${
                  editDragActive ? "border-blue-500 bg-blue-50" : "border-gray-300 hover:border-blue-500"
                }`}
                onDragEnter={handleEditDrag}
                onDragLeave={handleEditDrag}
                onDragOver={handleEditDrag}
                onDrop={handleEditDrop}
              >
                <input
                  type="file"
                  accept="image/*,video/*"
                  multiple
                  onChange={handleEditFileChange}
                  className="hidden"
                  id="edit-image-upload"
                />
                <label htmlFor="edit-image-upload" className="cursor-pointer">
                  {editForm.newMediaFiles && editForm.newMediaFiles.length > 0 ? (
                    <div className="flex flex-wrap gap-2 justify-center">
                      {editForm.newMediaFiles.map((m, i) => (
                        <div key={i} className="relative w-20 h-20">
                          {m.type === "video" ? (
                            <div className="w-full h-full bg-black rounded flex items-center justify-center text-white text-[8px]">VIDEO</div>
                          ) : (
                            <img src={m.url} className="w-full h-full object-cover rounded" />
                          )}
                          <button
                            type="button"
                            className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-1"
                            onClick={() => {
                              const updated = [...editForm.newMediaFiles];
                              updated.splice(i, 1);
                              setEditForm({ ...editForm, newMediaFiles: updated });
                            }}
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-600">Click or drag to add new media</p>
                  )}
                </label>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditing(null)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Update Product
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Confirmation Dialog */}
      {deleteId && (
        <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirm Delete</DialogTitle>
            </DialogHeader>
            <p>Are you sure you want to delete this product? This action cannot be undone.</p>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteId(null)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={() => handleDelete(deleteId)}>
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Crop Modal */}
      <Dialog open={cropModalOpen} onOpenChange={setCropModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Crop Image</DialogTitle>
          </DialogHeader>
          <div className="relative h-96 bg-gray-100">
            {imageToCrop && (
              <Cropper
                image={imageToCrop}
                crop={crop}
                zoom={zoom}
                aspect={1}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
              />
            )}
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Zoom</label>
            <input
              type="range"
              min={1}
              max={3}
              step={0.1}
              value={zoom}
              onChange={(e) => setZoom(parseFloat(e.target.value))}
              className="w-full"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCropModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={applyCrop}>Apply Crop</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AllProductsList;
