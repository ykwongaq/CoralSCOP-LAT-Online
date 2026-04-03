export interface Label {
  // Unique identifier for the label
  id: number;

  // Name of the label (e.g., "Car", "Person", "Tree")
  name: string;

  // Color associated with the label for visualization purposes (e.g., "#FF0000")
  color: string;

  // Optional sub-label (e.g., "Healthy", "Unhealthy" for a "Plant" label)
  status: string[];
}
