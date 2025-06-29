"use client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
const recentBillsOfSales = [
  {
    id: "BOS001",
    customer: "Alice Smith",
    totalAmount: "$250.00",
    status: "Paid",
  },
  {
    id: "BOS002",
    customer: "Bob Johnson",
    totalAmount: "$120.00",
    status: "Pending",
  },
  {
    id: "BOS003",
    customer: "Charlie Brown",
    totalAmount: "$500.00",
    status: "Paid",
  },
  {
    id: "BOS004",
    customer: "Diana Prince",
    totalAmount: "$75.00",
    status: "Overdue",
  },
  {
    id: "BOS005",
    customer: "Eve Adams",
    totalAmount: "$300.00",
    status: "Paid",
  },
  {
    id: "BOS006",
    customer: "Frank Green",
    totalAmount: "$180.00",
    status: "Pending",
  },
];

export default function BillsTable() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Sales</CardTitle>
        <CardDescription>
          Latest bills issued to your customers.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Bill ID</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Total Amount</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {recentBillsOfSales.map((bill) => (
              <TableRow key={bill.id}>
                <TableCell className="font-medium">{bill.id}</TableCell>
                <TableCell>{bill.customer}</TableCell>
                <TableCell>{bill.totalAmount}</TableCell>
                <TableCell>
                  <span
                    className={`px-2 py-1 rounded-full text-xs ${
                      bill.status === "Paid"
                        ? "bg-green-100 text-green-800"
                        : bill.status === "Pending"
                          ? "bg-yellow-100 text-yellow-800"
                          : "bg-red-100 text-red-800"
                    }`}
                  >
                    {bill.status}
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
