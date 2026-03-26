import { Link } from "react-router-dom";
import { MdOutlineEmail } from "react-icons/md";
import { MdDateRange } from "react-icons/md";

//Material ui data grid has used for the table
//initialize the columns for the tables and (field) value is used to show data in a specific column dynamically
export const userListsColumns = [
  {
    field: "username",
    headerName: "UserName",
    minWidth: 200,
    headerAlign: "center",
    disableColumnMenu: true,
    align: "center",
    editable: false,
    headerClassName: "text-black font-semibold border",
    cellClassName: "text-slate-700 font-normal  border",
    renderHeader: () => <span className="text-center">UserName</span>,
  },

  {
    field: "email",
    headerName: "Email",
    aligh: "center",
    width: 260,
    editable: false,
    headerAlign: "center",
    headerClassName: "text-black font-semibold text-center border ",
    cellClassName: "text-slate-700 font-normal  border  text-center ",
    align: "center",
    disableColumnMenu: true,
    renderHeader: () => <span>Email</span>,
    renderCell: (params) => {
      return (
        <div className=" flex  items-center justify-center  gap-1 ">
          <span>
            <MdOutlineEmail className="text-slate-700 text-lg" />
          </span>
          <span>{params?.row?.email}</span>
        </div>
      );
    },
  },
  {
    field: "created",
    headerName: "Created At",
    headerAlign: "center",
    width: 220,
    editable: false,
    headerClassName: "text-black font-semibold border",
    cellClassName: "text-slate-700 font-normal  border  ",
    align: "center",
    disableColumnMenu: true,
    renderHeader: () => <span>Created At</span>,
    renderCell: (params) => {
      return (
        <div className=" flex justify-center  items-center  gap-1 ">
          <span>
            <MdDateRange className="text-slate-700 text-lg" />
          </span>
          <span>{params?.row?.created}</span>
        </div>
      );
    },
  },
  {
    field: "status",
    headerName: "Status",
    headerAlign: "center",
    align: "center",
    width: 200,
    editable: false,
    disableColumnMenu: true,
    headerClassName: "text-black font-semibold border ",
    cellClassName: "text-slate-700 font-normal  border  ",
    renderHeader: () => <span className="ps-10">Status</span>,
  },
  {
    field: "action",
    headerName: "Action",
    headerAlign: "center",
    editable: false,
    headerClassName: "text-black font-semibold text-cente",
    cellClassName: "text-slate-700 font-normal",
    sortable: false,
    width: 200,
    renderHeader: () => <span>Action</span>,
    renderCell: (params) => {
      return (
        <Link
          to={`/admin/users/${params.id}`}
          className="h-full flex  items-center justify-center   "
        >
          <button className="bg-btnColor text-white px-4 flex justify-center items-center  h-9 rounded-md ">
            Views
          </button>
        </Link>
      );
    },
  },
];