import { Link } from "react-router-dom";
import { MdDateRange } from "react-icons/md";
import { auditLogsTruncateTexts } from "../../utils/truncateText.jsx";



//Material ui data grid has used for the table
//initialize the columns for the tables and (field) value is used to show data in a specific column dynamically
export const auditLogColumns = [
  {
    field: "actions",
    headerName: "Action",
    width: 160,
    headerAlign: "center",
    disableColumnMenu: true,
    align: "center",
    editable: false,
    headerClassName: "text-black font-semibold border",
    cellClassName: "text-slate-700 font-normal  border",
    renderHeader: () => <span>Action</span>,
  },
  {
    field: "username",
    headerName: "UserName",
    width: 180,
    editable: false,
    disableColumnMenu: true,
    headerAlign: "center",
    align: "center",
    headerClassName: "text-black font-semibold border",
    cellClassName: "text-slate-700 font-normal  border",
    renderHeader: () => <span>UserName</span>,
  },
  {
    field: "timestamp",
    headerName: "TimeStamp",
    disableColumnMenu: true,
    width: 220,
    editable: false,
    headerAlign: "center",
    align: "center",
    headerClassName: "text-black font-semibold border",
    cellClassName: "text-slate-700 font-normal  border",
    renderHeader: () => <span>TimeStamp</span>,
    renderCell: (params) => {
      return (
        <div className=" flex  items-center justify-center  gap-1 ">
          <span>
            <MdDateRange className="text-slate-700 text-lg" />
          </span>
          <span>{params?.row?.timestamp}</span>
        </div>
      );
    },
  },
  {
    field: "noteid",
    headerName: "NoteId",
    disableColumnMenu: true,
    width: 150,
    editable: false,
    headerAlign: "center",
    align: "center",
    headerClassName: "text-black font-semibold border",
    cellClassName: "text-slate-700 font-normal  border",
    renderHeader: () => <span>NoteId</span>,
  },
  {
    field: "note",
    headerName: "Note Content",
    width: 220,
    editable: false,
    headerAlign: "center",
    disableColumnMenu: true,
    align: "center",
    headerClassName: "text-black font-semibold border",
    cellClassName: "text-slate-700 font-normal  border",
    renderHeader: () => <span>Note Content</span>,
    renderCell: (params) => {
      const contens = JSON.parse(params?.value)?.content;
      const response = auditLogsTruncateTexts(contens);

      return <p className=" text-slate-700 text-center   ">{response}</p>;
    },
  },
  {
    field: "action",
    headerName: "Action",
    width: 150,
    editable: false,
    headerAlign: "center",
    align: "center",
    headerClassName: "text-black font-semibold ",
    cellClassName: "text-slate-700 font-normal  ",
    sortable: false,
    renderHeader: () => <span>Details</span>,
    renderCell: (params) => {
      return (
        <Link
          to={`/admin/audit-logs/${params.row.noteId}`}
          className="h-full flex justify-center  items-center   "
        >
          <button className="bg-btnColor text-white px-4 flex justify-center items-center  h-9 rounded-md ">
            Views
          </button>
        </Link>
      );
    },
  },
];
