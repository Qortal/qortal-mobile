import { useRef, useState } from 'react';

interface State {
    isShow: boolean;
}
export const useModal = () => {
    const [state, setState] = useState<State>({
        isShow: false,
    });
    const [message, setMessage] = useState({
        publishFee: "",
        message: ""
    });
    const promiseConfig = useRef<any>(null);
    const show = async (data) => {
        setMessage(data)
        return new Promise((resolve, reject) => {
            promiseConfig.current = {
                resolve,
                reject,
            };
            setState({
                isShow: true,
            });
        });
    };

    const hide = () => {
        setState({
            isShow: false,
        });
        setMessage({
            publishFee: "",
        message: ""
        })
    };

    const onOk = (payload:any) => {
        const { resolve } = promiseConfig.current;
        setMessage({
            publishFee: "",
        message: ""
        })
        hide();
        resolve(payload);
    };

    const onCancel = () => {
        const { reject } = promiseConfig.current;
        hide();
        reject('Declined');
        setMessage({
            publishFee: "",
        message: ""
        })
    };
    return {
        show,
        onOk,
        onCancel,
        isShow: state.isShow,
        message
    };
};